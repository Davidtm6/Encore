# Testing

Encore has three kinds of automated checks. GitHub Actions runs all of them on every pull request and on every push to `main`.

| Kind | Tool | What it covers |
| --- | --- | --- |
| Unit tests | [Jest](https://jestjs.io/) with TypeScript (through `ts-jest`) | Plain TypeScript logic: the ranking engine, the search function's logic, app error messages, and the consistency of the starter-film SQL files |
| Database tests | `psql` against a throwaway Postgres | The migrations, seed, and demo script, sign-up, `save_ranking`, and who can see or change what (row-level security) |
| Static checks | `tsc`, ESLint, and `deno check` | Type errors and hook mistakes in the app, and type errors in the Edge Function |

The Python ranking prototype keeps its own `unittest` suite, which CI also runs. Screens are still checked by hand, following the demo script in [setup](setup.md#demo-script).

## Run the tests

Install Node.js 24, the version in `.nvmrc` and CI ([setup](setup.md#1-install-nodejs-24-and-the-dependencies) explains how). From the repository root, after `npm run setup`:

```sh
npm test                    # every Jest test
npm run test:db             # database tests (needs Postgres; see below)
npm run check:functions     # type-check the search-movies Edge Function (downloads Deno on first run)
```

Useful variations:

```sh
npm test -- app/src/ranking              # one folder
npm test -- -t "falls back"              # tests whose name matches
npm run test:watch                       # rerun on save
npm run test:coverage                    # coverage report in coverage/
```

Type-check and lint the app from `app/`:

```sh
npm run typecheck
npm run lint
```

The Python prototype tests need Python 3.10 or newer and no packages:

```sh
python3 -m unittest discover -s prototype -v
```

### Database tests on your machine

The database tests need `psql` and a Postgres server where you can create databases. They never touch the team's Supabase project. On macOS with Homebrew:

```sh
brew install postgresql@17
brew services start postgresql@17
npm run test:db
```

The runner connects with the usual `PG*` variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`). With none set, `psql` uses the local server and your login name, which is what Homebrew sets up. Each test file gets its own database, `encore_test_<name>`, which is dropped afterwards. If you don't have Postgres, CI runs these tests on every pull request.

## What is tested

| Suite | Covers |
| --- | --- |
| `app/src/ranking/ranking-session.test.ts` | The ranking engine used by the Rank screen: first movie, every insertion position for lists of 0–128 films within `ceil(log2(n + 1))` comparisons, cancel leaving the list unchanged, and re-rank keeping other movies in order |
| `app/src/services/search-error.test.ts` | The message Search shows when the search function fails: offline, expired session (401), the function's own error, and anything else |
| `supabase/functions/search-movies/search.test.ts` | The search function's logic with fake TMDB and database calls. It covers reading the query (trimmed, capped at 100 characters), the TMDB URL (no adult results; popular movies for an empty query), saving results and returning them in TMDB's order, and the fallbacks: saved movies when TMDB or saving fails, an error only when that fails too |
| `supabase/functions/search-movies/tmdb.test.ts` | How TMDB results become `movies` rows: year and poster parsing; dropping adult, untitled, and repeated results while keeping TMDB's order; escaping search wildcards |
| `supabase/tests/starter-catalog.test.ts` | That `seed.sql`, the two TMDB migrations, and the demo script agree on the same 50 films, TMDB IDs, and posters |
| `supabase/tests/database/ranking-and-access.test.sql` | Sign-up creating profiles, marking movies watched, `save_ranking` (including every rejection), reviews, and what another user or a signed-out user can and can't do |
| `supabase/tests/database/starter-catalog.test.sql` | The seed and demo script on a fresh database, both safe to rerun, and the TMDB migrations being no-ops there |
| `supabase/tests/database/tmdb-migrations.test.sql` | Both TMDB migrations on the shared database's old state: films relabeled with row ids kept, lists, rankings, and reviews untouched, a film search already saved left alone, and posters filled only where missing |
| `prototype/ranking.test.ts` and `prototype/test_ranking.py` | The reference binary-insertion prototypes |

Each suite was checked by breaking the code on purpose and confirming a test fails.

## Add a test

### A Jest test

1. Create a file ending in `.test.ts` (or `.test.tsx`) next to the code it tests, for example `search.test.ts` beside `search.ts`. Jest finds it automatically; there is nothing to register.
2. Write the test:

   ```ts
   import { tmdbUrl } from './search.ts';

   describe('tmdbUrl', () => {
     it('asks for popular movies when the query is empty', () => {
       expect(tmdbUrl('')).toContain('/movie/popular');
     });
   });
   ```

3. Run `npm test` and check that it passes. Also check that it can fail: break the code briefly and confirm the test catches it.
4. Open a pull request. CI runs the new test with the rest.

Some things to know:
- **App code:** app modules can be imported with the app's `@/` paths, as in `@/services/errors`. The root Jest config maps them to `app/src/`.
- **Edge Function code:** imports use a `.ts` extension, as Deno requires, and that works in Jest too.
- **React Native code:** Jest here can't load React Native or the Supabase client. Keep the logic you want to test in a plain module, as `search-error.ts` and `ranking-session.ts` do, and import it from the code that needs the client.

Name each `it(...)` after the behavior it checks, so a failure in CI reads as a sentence. Every bug fix gets a regression test that fails before the fix.

### A database test

1. Add a file ending in `.test.sql` to `supabase/tests/database/`. The runner gives it a fresh database with `supabase-stub.sql` (a stand-in for Supabase's auth schema and roles) and every migration applied. Load the starter films with `\ir ../../seed.sql` if the test needs them.
2. Use the helpers from `helpers.sql`:
   - `pg_temp.check(label, condition)` checks that a condition is true.
   - `pg_temp.check_equal(label, actual, expected)` compares text.
   - `pg_temp.expect_error(label, statement, sqlstate)` checks that a statement fails with a given error code, for example `42501` (permission denied).
3. To act as a user, run `set role authenticated;` and then `set request.jwt.claims = '{"sub":"<user id>"}';`. For a signed-out user, run `set role anon;`.
4. Run `npm run test:db`. Each passing check prints `ok  <label>`. A failing one prints `FAIL:` with the expected and actual values.

For the Python prototype, add `test_*` methods to `prototype/test_ranking.py`, or create a new `prototype/test_*.py` file.

## Continuous integration

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It has five jobs:

| Job | What it runs |
| --- | --- |
| Jest (TypeScript) | `npm ci`, then `npm test -- --ci` |
| App (typecheck and lint) | In `app/`: `npm ci`, `npm run typecheck`, `npm run lint` |
| Database (migrations and access rules) | `supabase/tests/run-database-tests.sh` against a Postgres 17 service container |
| Edge Function (type check) | `npm run check:functions` |
| Python prototype | `python -m unittest discover -s prototype -v` |

Results appear in the **Checks** section of each pull request and on the repository's **Actions** tab. To see why a job failed, open it and expand the failed step; the output matches what the same command prints locally.

To make a failing check block the merge, a repository admin adds the jobs as required status checks: **Settings → Branches → Branch protection rules** (or **Rulesets**) for `main`, then **Require status checks to pass** and select all five.

Add a root dependency with `npm install --save-dev <package>` and commit both `package.json` and `package-lock.json`; CI installs exactly what the lockfile lists. In `app/`, add packages with `npx expo install <package>` so the version matches the Expo SDK.

## Component tests and `server/`

Component tests need the `jest-expo` preset and React Native Testing Library. When the first one is added, give `app/` its own `jest.config.js` and list each folder in the root config's [`projects`](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) option. `npm test` at the root then still runs everything, and CI needs no change. Maestro system tests run before each tester release and will get their own workflow.
