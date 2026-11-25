# Testing

Encore has three kinds of automated checks. GitHub Actions runs all of them on every pull request and on every push to `main`.

| Kind | Tool | What it covers |
| --- | --- | --- |
| Unit tests | [Jest](https://jestjs.io/) with TypeScript (through `ts-jest`) | Plain TypeScript logic: the ranking engine, the search function's logic, app error messages, and the consistency of the starter-film SQL files |
| Database tests | `psql` against a throwaway Postgres | The migrations, seed, and demo script, sign-up, `save_ranking`, and who can see or change what (row-level security) |
| Static checks | `tsc`, ESLint, and `deno check` | Type errors and hook mistakes in the app, and type errors in the Edge Function |

The Python ranking prototype keeps its own `unittest` suite, which CI also runs. One Jest test calls the real TMDB when a token is set; see [the TMDB format test](#the-tmdb-format-test). Screens are still checked by hand, following the demo script in [setup](setup.md#demo-script).

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

Type-check and lint the app, and type-check the Edge Function, with one command from the repository root:

```sh
npm run build
```

Or run the app's checks separately from `app/`:

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

### The TMDB format test

`tmdb-contract.test.ts` calls TMDB's search and credits endpoints, so it needs TMDB's **API Read Access Token**. Without `TMDB_READ_ACCESS_TOKEN` set, Jest skips it, so `npm test` works without a token. To run it, enter the token at the silent prompt, which keeps it out of your shell history:

```sh
read -s TMDB_READ_ACCESS_TOKEN && export TMDB_READ_ACCESS_TOKEN && npm test -- tmdb-contract
```

## What is tested

| Suite | Covers |
| --- | --- |
| `app/src/ranking/ranking-session.test.ts` | The ranking engine used by the Rank screen: first movie, every insertion position for lists of 0–128 films within `ceil(log2(n + 1))` comparisons, and for 200, 500, and 1,000 films within `floor` to `ceil` of `log2(n + 1)`; the recorded counts in [Ranking large lists](#ranking-large-lists), including within one tier of a 999-film list; cancel leaving the list unchanged, re-rank keeping other movies in order, the "Question 2 of up to 4" count never promising too few, undoing an answer, and the films above and below the new place; tiers (comparisons and the final place stay in the chosen tier, an empty tier needs none) and skips (never the same movie twice, landing in the middle when everything is skipped, at most one place off after a skip, the progress bar still only moving forward) |
| `app/src/ranking/score.test.ts` | The 0.0–10.0 scores: each tier's band edges, a tier of one, scores never rising further down any mix of tiers, every loved movie above every okay one |
| `app/src/services/auth-validation.test.ts` | The sign-in and sign-up form rules, and that every invalid field is reported at once |
| `app/src/services/friends.test.ts` | Sorting your adds into friends, "Added you", and "Waiting for them to add you back"; naming a relation; and building a safe username search pattern |
| `app/src/services/comments.test.ts` | Comments: the length limit, who can edit or delete, spotting an edited comment, counting comments per review, and the comments button's label |
| `app/src/services/my-list-layout.test.ts` | My List's views (#82): sections by score (unranked newest first, then the ranking) and by recently added, stable ties, finding a film to scroll to it, grid columns for phone and wide screens, splitting into rows, and reading a remembered view or sort |
| `app/src/services/movie-page.test.ts` | The movie page: sorting reviews and watched rows into your take, friends (best-placed first, then unranked), and other people's public reviews (never with a rank); "#4 of 62" and its spoken form |
| `app/src/services/tmdb-rating.test.ts` | The TMDB score in search: "★ 8.5" and its spoken form, hidden under 10 votes or when TMDB has none |
| `app/src/services/review-visibility.test.ts` | Review visibility: friends-only by default, reading a stored value safely, and the picker's options and hints |
| `app/src/services/search-error.test.ts` | The message Search shows when the search function fails: offline, expired session (401), the function's own error, and anything else |
| `supabase/functions/search-movies/search.test.ts` | The search function's logic with fake TMDB and database calls. It covers reading the query (trimmed, capped at 100 characters), the TMDB URL (no adult results; popular movies for an empty query), saving results and returning them in TMDB's order with their overviews, near-match suggestions for a query that finds nothing, and the fallbacks: saved movies (marked `fromSaved`) when TMDB or saving fails, an error only when that fails too |
| `supabase/functions/search-movies/typo.test.ts` | Typo tolerance: the looser queries tried for a misspelled search, edit distance, and which titles are close enough to suggest, nearest first |
| `supabase/functions/search-movies/tmdb.test.ts` | How TMDB results become `movies` rows: year and poster parsing; dropping adult, untitled, and repeated results while keeping TMDB's order; trimming overviews; escaping search wildcards |
| `supabase/functions/search-movies/credits.test.ts` | Directors: picking the director out of TMDB's credits (none, one, several, repeated), reading a `directorsFor` request, and looking up only the directors still missing, carrying on when one lookup fails |
| `supabase/functions/search-movies/tmdb-contract.test.ts` | That TMDB's live search response still has the fields the search function reads (`id`, `title`, `release_date`, `poster_path`, `overview`, `adult`), checked on one known film. It skips when `TMDB_READ_ACCESS_TOKEN` isn't set |
| `supabase/tests/starter-catalog.test.ts` | That `seed.sql`, the two TMDB migrations, and the demo script agree on the same 50 films, TMDB IDs, and posters |
| `supabase/tests/database/ranking-and-access.test.sql` | Sign-up creating profiles, marking movies watched, `save_ranking` (including every rejection), reviews, and what another user or a signed-out user can and can't do |
| `supabase/tests/database/review-comments.test.sql` | Comments: friends can comment on friends-only reviews and anyone on public ones; strangers can neither see nor write comments on friends-only reviews; only the author can edit or delete (not even the review's author), and a comment can't be moved; when a public review goes friends-only, its comments stay readable by the author and friends, and a stranger who commented can't add more but still sees their own; deleting the review deletes its comments |
| `supabase/tests/database/review-visibility.test.sql` | Who can read a review: friends-only by default, readable by the author and mutual friends; public reviews by everyone signed in; a one-way add or a removed friend sees only public reviews; only the author can change visibility; `is_friend` |
| `supabase/tests/database/friends.test.sql` | Friends: a one-way add shows nothing, mutual adds show each other's list, ranking, and reviews, friends can't change each other's lists, `save_ranking` ignores a friend's visible films, strangers and signed-out users see nothing, and removing a friend hides the list again |
| `supabase/tests/database/ranking-tiers.test.sql` | Tiers: old rankings split into thirds (lists of 1, 2, 3, and 7), a ranked film always having a valid tier and an unranked one none, `save_ranking` saving tiers and rejecting out-of-order, missing, unknown, or too few tiers, the old one-argument version being gone, and removals keeping tiers |
| `supabase/tests/database/remove-watched.test.sql` | Removing a movie from the watched list: the ranking closes up (including several removals at once), the review goes too, and nobody can remove another user's movies |
| `supabase/tests/database/large-ranking.test.sql` | `save_ranking` with 1,000 films: the first save, adding a film at #1 (every other film moves down), and reversing the whole list, each correct and under 5 seconds; the times show in the output |
| `supabase/tests/database/movie-rating.test.sql` | The TMDB score columns: kept to 0–10 and one decimal place, empty for starter films, readable but not writable by signed-in users |
| `supabase/tests/database/movie-director.test.sql` | The `director` column: empty names are rejected, and signed-in users can read it but not change it |
| `supabase/tests/database/starter-catalog.test.sql` | The seed and demo script on a fresh database, both safe to rerun, and the TMDB migrations being no-ops there |
| `supabase/tests/database/tmdb-migrations.test.sql` | Both TMDB migrations on the shared database's old state: films relabeled with row ids kept, lists, rankings, and reviews untouched, a film search already saved left alone, and posters filled only where missing |
| `prototype/ranking.test.ts` and `prototype/test_ranking.py` | The reference binary-insertion prototypes |

Each suite was checked by breaking the code on purpose and confirming a test fails.

## Ranking large lists

How many comparisons ranking takes as a list grows (#64). The numbers come from the engine itself and are checked by the "large lists" tests in `ranking-session.test.ts`, so they stay true if the engine changes.

**Placing one more film** in a list of n films, comparing against the whole list (as when every film shares one tier):

| Films ranked | At #1 | At the bottom | In the middle | Average over every place | Range |
| --- | --- | --- | --- | --- | --- |
| 100 | 7 | 6 | 6 | 6.73 | 6–7 |
| 200 | 8 | 7 | 7 | 7.73 | 7–8 |
| 500 | 9 | 8 | 8 | 8.98 | 8–9 |
| 1,000 | 10 | 9 | 9 | 9.98 | 9–10 |

**Building a list from nothing**, one film at a time:

| Films | Fewest comparisons in all (every film at the bottom) | Most (every film at #1) |
| --- | --- | --- |
| 100 | 480 | 573 |
| 200 | 1,153 | 1,345 |
| 500 | 3,498 | 3,989 |
| 1,000 | 7,987 | 8,977 |

**Saving:** `save_ranking` rewrites every position on each save. `large-ranking.test.sql` saves 1,000 films, adds one at #1, and reverses all 1,001; each save must finish in under 5 seconds, and CI's output lists the actual times.

**With tiers (#60).** The Rank screen first asks Loved it / It was okay / Didn't like it, and then compares only within that tier. With a list split evenly into thirds, that's one tier question plus:

| Films ranked | Films in the tier | Comparisons within the tier |
| --- | --- | --- |
| 100 | about 33 | 5–6 |
| 200 | about 67 | 6–7 |
| 500 | about 167 | 7–8 |
| 1,000 | about 333 | 8–9 (checked for 999 films in `ranking-session.test.ts`) |

**What this means for Risk 2 (comparison fatigue):**
- Adding a film stays cheap however long the list gets: at most 10 comparisons at 1,000 films, and about one fewer with tiers, since the tier question cuts the list to a third.
- The cost is building a big list in the first place: someone importing 100 films faces 480–573 comparisons without tiers. Tiers save roughly 1.6 comparisons per film once the list is long, and "Too close to call? Skip" (#43) helps with hard pairs, but a big import still means hundreds of questions.
- The planned matchup rate limit (#14, 100 per hour) would stop someone building a list from nothing partway through their 27th to 32nd film without tiers, a little later with them. Its number should be revisited before it's built.
- Not yet checked by hand: scrolling and ranking in the app with a list of 200 or more. `supabase/demo/large-ranking.sql` sets that up, split into thirds by tier; see [Prepare a demo account](setup.md#4-prepare-a-demo-account).

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

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It has seven jobs:

| Job | What it runs |
| --- | --- |
| Jest (TypeScript) | `npm ci`, then `npm test -- --ci`. It has no TMDB token, so it skips the TMDB format test |
| TMDB format | `npm ci`, then `npm test -- --ci tmdb-contract` with the `TMDB_READ_ACCESS_TOKEN` repository secret |
| App (typecheck and lint) | In `app/`: `npm ci`, `npm run typecheck`, `npm run lint` |
| Build (npm run build) | `npm ci --prefix app`, then the README's `npm run build` |
| Database (migrations and access rules) | `supabase/tests/run-database-tests.sh` against a Postgres 17 service container |
| Edge Function (type check) | `npm run check:functions` |
| Python prototype | `python -m unittest discover -s prototype -v` |

Results appear in the **Checks** section of each pull request and on the repository's **Actions** tab. To see why a job failed, open it and expand the failed step; the output matches what the same command prints locally.

The "Protect main" ruleset (**Settings → Rules → Rulesets**) blocks merging until the Jest, App, Database, and Edge Function jobs pass. Build, Python prototype, and TMDB format run but aren't required: Build repeats the App and Edge Function checks, the prototype may be removed, and a TMDB outage shouldn't block merges. To require another job, a repository admin adds it under **Require status checks to pass**. Add it only after it has run on a pull request at least once, and never require a job that might be deleted, or every PR will wait for it forever.

The TMDB format job is green even when its test is skipped, which happens when the secret is missing, for example on pull requests from forks. To confirm the test ran, open the job's log. A repository admin sets the secret with `gh secret set TMDB_READ_ACCESS_TOKEN --repo Davidtm6/Encore`, which prompts for the value.

Add a root dependency with `npm install --save-dev <package>` and commit both `package.json` and `package-lock.json`; CI installs exactly what the lockfile lists. In `app/`, add packages with `npx expo install <package>` so the version matches the Expo SDK.

## Component tests and `server/`

Component tests need the `jest-expo` preset and React Native Testing Library. When the first one is added, give `app/` its own `jest.config.js` and list each folder in the root config's [`projects`](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) option. `npm test` at the root then still runs everything, and CI needs no change. Maestro system tests run before each tester release and will get their own workflow.
