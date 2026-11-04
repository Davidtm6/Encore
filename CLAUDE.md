# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Encore is a CSE 403 team project: an Expo (React Native, TypeScript) mobile app where users rank movies through head-to-head comparisons and write one review per movie. Backend is Supabase (Auth, Postgres with RLS, one Edge Function for TMDB search). `README.md` and `docs/` are the source of truth for setup, testing, and process; `docs/living-document.md` holds requirements, architecture, and open questions.

## Commands

Node 24 (`.nvmrc`). There are two npm packages: the repo root (Jest, Supabase CLI, test scripts) and `app/` (the Expo app, its own `package.json`/lockfile).

From the repo root:

```sh
npm run setup                  # check Node, install root + app deps
npm run build                  # app typecheck + lint, then Edge Function check (stops at first error)
npm start                      # Expo over a tunnel (scan QR with Expo Go); npm run start:lan for LAN
npm test                       # all Jest tests (any *.test.ts(x) anywhere in the repo)
npm test -- app/src/ranking    # one folder/file
npm test -- -t "falls back"    # tests whose name matches
npm run test:db                # SQL tests against a local Postgres (psql + PG* env vars)
npm run check:functions        # deno type-check of the search-movies Edge Function
python3 -m unittest discover -s prototype -v   # Python ranking prototype
```

From `app/`: `npm run typecheck` and `npm run lint` (`expo lint`). Add app packages with `npx expo install <pkg>` so versions match the Expo SDK.

CI (`.github/workflows/ci.yml`) runs Jest, app typecheck+lint, `npm run build`, database tests (Postgres 17), Edge Function check, and the Python prototype. The `main` ruleset requires a PR and the Jest, App, Database, and Edge Function checks to pass. Branch, commit, PR, and bug conventions are in `CONTRIBUTING.md`.

## Architecture

**App layering (`app/src/`):** Expo Router screens in `app/` → one hook per screen in `hooks/` (state, loading, errors, retries) → typed Supabase calls in `services/`. Imports use the `@/` alias for `app/src/`. Screens should not call Supabase directly; when the planned Encore API (`server/`, not built yet) arrives, only `services/` is supposed to change.

**No API server yet.** The app talks to Supabase directly with the publishable key (`app/.env.development`, committed; override in `.env.local`). The security boundary is therefore RLS on every table plus database functions like `save_ranking`, not app code.

**Ranking:** binary insertion into a best-to-worst list.
- `app/src/ranking/ranking-session.ts` is a pure, immutable step-by-step engine (`startRanking` → `nextOpponent`/`choose` → `finalOrder`); canceling just drops the session. Re-ranking removes the movie and reinserts it. At most `ceil(log2(n+1))` comparisons.
- `hooks/use-ranking.ts` drives it; `services/ranking-api.ts` calls the `save_ranking(p_order bigint[])` RPC, which locks the user's rows, validates the full order (complete, no duplicates, only the caller's watched movies), and rewrites all positions atomically. Error code `40001` = list changed elsewhere (hook restarts the session); `22023` = invalid order.
- Rank position lives on `watched_movies`; there is no separate rankings table.
- `prototype/` (Python + TS) is the reference implementation, not app code.

**Movie search:** the app never calls TMDB. `services/movie-service.ts` invokes the `search-movies` Edge Function, which checks the user's token, queries TMDB (`/search/movie`, or `/movie/popular` for an empty query), upserts results into `movies` with the admin client (the app has no write access to `movies`), and returns rows with Encore's own `id` in TMDB order. If TMDB fails it falls back to already-saved movies. Pure logic lives in `search.ts`/`tmdb.ts` (Jest-tested, `.ts` import extensions for Deno); `index.ts` holds the Deno/Supabase glue. Details in `docs/movie-search.md`.

**Errors:** services throw `Error`s whose messages are user-facing (`services/errors.ts`: `userError`, `messageOf`, offline detection); hooks surface `messageOf(e)`.

## Testing constraints

- Root Jest uses `ts-jest` in a Node environment and **cannot load React Native or the Supabase client**. Keep testable logic in plain modules (like `ranking-session.ts`, `search-error.ts`) and test those. Component tests would need a separate `jest-expo` project (see `docs/testing.md`).
- DB tests: add `supabase/tests/database/*.test.sql`; each gets a fresh database with `supabase-stub.sql` and all migrations applied. Use `pg_temp.check`, `check_equal`, `expect_error` from `helpers.sql`; impersonate users with `set role authenticated; set request.jwt.claims = '{"sub":"<uuid>"}';`.
- `supabase/tests/starter-catalog.test.ts` checks that `seed.sql`, the TMDB migrations, and `demo/demo-account.sql` agree on the same 50 films — update them together.

## Schema changes

- Never edit an existing migration; add a new file in `supabase/migrations/`.
- Migrations are pushed to the shared dev database only after the PR merges, and only by the backend owner — don't run `supabase db push` unprompted.
- `app/src/types/database.ts` is generated (`npx supabase gen types typescript ...`); don't hand-edit. Commit migrations and regenerated types together.

## Conventions

- Style: Google TypeScript Style Guide and Airbnb React/JSX guide (Google wins on conflicts, e.g. default exports). Currently only `eslint-config-expo` is actually wired up.
- Any PR that changes setup or behavior updates the relevant doc in `docs/` or `README.md`.
