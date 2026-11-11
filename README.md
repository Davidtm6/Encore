# Encore

Encore is a social movie-ranking mobile app for iOS and Android built for CSE 403. Instead of assigning stars or numerical scores, users choose between two movies in head-to-head comparisons to build a personal best-to-worst list, and write one editable review per movie.

Team: Alexander Knotwell, David Tong, Lucas Mesfin, Pavan Chaganti, and Nathan Simon. Roles, schedule, and process are in the [living document](docs/living-document.md).

Contents: [Operational use cases](#operational-use-cases) · [Prerequisites](#prerequisites) · [Build](#build) · [Test](#test) · [Run](#run) · [Architecture](#architecture) · [Repository layout](#repository-layout) · [Contributing and bugs](#contributing-and-bugs)

## Operational use cases

The MVP is four features: accounts, finding and logging movies, ranking and re-ranking through comparisons, and one editable review per movie. All five use cases from the [living document](docs/living-document.md#3-use-cases-functional-requirements) work end to end in the Expo app against the team's Supabase development project.

| Use case | Status | What works | Components it touches |
| --- | --- | --- | --- |
| **UC1:** Create an account | Operational | Sign up with email, username, and password; sign in; sign out. The session survives app restarts. | App → Supabase Auth → Postgres (a trigger creates the profile) |
| **UC2:** Find and log a movie | Operational | Search TMDB by title (with posters and a line of plot to tell similar films apart) or browse popular films, then mark one watched. A misspelled title gets "Did you mean" suggestions. Undo it right away, or remove a movie from My List later. If TMDB is down, search falls back to films already saved. | App → Supabase Auth (login token) → `search-movies` Edge Function → TMDB → Postgres (saves the results); then App → Postgres (`watched_movies`, RLS) |
| **UC3:** Rank a watched movie | Operational | Pick between two films until the new one has a place; the first film goes straight to #1. The screen counts the questions, Undo takes back the last answer, and the result shows the films above and below before you save. Leaving without saving asks first, whichever way you leave, and leaves the list unchanged. The whole order saves atomically. | App (ranking engine) → Postgres (`save_ranking` function, RLS) |
| **UC4:** Re-rank a movie | Operational | Re-rank any ranked film through the same comparisons; other films keep their order. If the list changed elsewhere, the app starts over instead of saving a stale order. | App (ranking engine) → Postgres (`save_ranking` function, RLS) |
| **UC5:** Write or edit a review | Operational | Write, then edit, one review per watched film, up to 10,000 characters. A failed save keeps the text for a retry. | App → Postgres (`reviews`, RLS: one per user and film, only the author can change it) |

**UC2 touches every major component:** the app, Supabase Auth, the `search-movies` Edge Function, TMDB, and the Postgres database (see [Architecture](#architecture)).

Not built yet, planned before the tester release:
- Required email verification and password reset (UC1).
- The 100-matchups-per-hour limit (UC3, UC4) and the review content filter (UC5).
- The Encore API server (`server/`); see [Architecture](#architecture).
- EAS builds for TestFlight and Google Play internal testing.

Friendships with shared reviews and comments, and personalized recommendations, are stretch goals that start only after the MVP passes its tests.

## Prerequisites

| You need | For | Notes |
| --- | --- | --- |
| [Git](https://git-scm.com/) | Everything | |
| [Node.js 24](https://nodejs.org/) | Build, test, run | The version is in `.nvmrc`. Older than 22 won't work. [Setup](docs/setup.md#1-install-nodejs-24-and-the-dependencies) shows how to install it with Homebrew, nvm, or nvm-windows. |
| [Expo Go](https://expo.dev/go) for Expo SDK 58 on an iPhone or Android phone | Run | Or the iOS Simulator (macOS with Xcode) or the Android emulator. |
| Postgres 17 with `psql` | Database tests only (optional) | CI runs them on every pull request. |
| Python 3.10 or newer | Ranking prototype only (optional) | |

You don't need a Supabase or TMDB account: the app points at the team's Supabase development project, and only its Edge Function talks to TMDB.

## Build

From a fresh clone:

```sh
git clone https://github.com/Davidtm6/Encore.git
cd Encore
npm run setup   # checks your Node version, installs the root and app dependencies
npm run build   # type-checks and lints the app, then type-checks the Edge Function
```

`npm run setup` takes under a minute. npm may warn that install scripts for `unrs-resolver` or `@parcel/watcher` aren't approved; that's expected, and nothing needs them. `npm run build` stops at the first error. The Edge Function check downloads Deno the first time. CI runs the same command on every pull request.

Expo bundles the app's JavaScript when you [run](#run) it, so there is no separate compile step. Store builds (EAS) come before the tester release.

## Test

After `npm run setup`, from the repository root:

```sh
npm test   # every Jest test: ranking engine, search logic, error messages, starter-film consistency
```

It needs no network, database, or accounts, and ends with `Test Suites: 6 passed`.

The other suites:

```sh
npm run test:db                                # database tests: migrations, sign-up, save_ranking, and access rules (needs Postgres)
npm run check:functions                        # Edge Function type check (also part of npm run build)
python3 -m unittest discover -s prototype -v   # Python ranking prototype
```

The database tests create and drop their own throwaway databases on a local Postgres and never touch the team's Supabase project. Without Postgres, rely on CI. To set it up on macOS, run `brew install postgresql@17` and `brew services start postgresql@17`.

GitHub Actions runs all of these, plus `npm run build`, on every pull request and every push to `main`; the results appear under **Checks** on the PR. [Testing](docs/testing.md) covers running one test, adding a test, and how CI reports failures. Screens are checked by hand with the [demo script](docs/setup.md#demo-script).

## Run

After `npm run setup`, from the repository root:

```sh
npm start   # starts Expo over a tunnel, which works on any network
```

Then open the app:
- **iPhone:** scan the QR code with the Camera app and tap **Open in Expo Go**.
- **Android:** scan the QR code from inside Expo Go.
- **Simulator or emulator:** press `i` (iOS Simulator) or `a` (Android emulator) in the terminal.

`app/.env.development` already points at the team's Supabase project, so there is nothing to configure. On a home network, `npm run start:lan` reloads faster than the tunnel.

To try it, sign up with any email address and a username; you're signed in right away, since email verification is off on the development project. There's no password reset yet, so if you mistype something, sign up again with a different email. Then follow the use cases above: search for a film, mark it watched, rank it, rank a second one, and write a review.

For a longer list to rank against, [Prepare a demo account](docs/setup.md#4-prepare-a-demo-account) fills an account with 10 ranked films and a review (it needs access to the Supabase dashboard). The [setup guide](docs/setup.md#run-the-app) has the full demo script, troubleshooting (for example a red screen about `EXPO_PUBLIC_SUPABASE_URL`), and how to point the app at your own Supabase project.

## Architecture

| Component | Technology | Role |
| --- | --- | --- |
| Mobile app | React Native (TypeScript) with Expo and Expo Router | Screens call one hook each, and hooks call typed services in `app/src/services/`. |
| Ranking engine | TypeScript, in the app (`app/src/ranking/`) | Binary insertion: picks each pair and finds the new position in at most `ceil(log2(n + 1))` comparisons. |
| Auth | Supabase Auth | Sign up, sign in, and the login tokens every other call carries. |
| Movie search | Supabase Edge Function `search-movies` (Deno, TypeScript) | Checks the login token, queries TMDB, saves the results to `movies`, and falls back to saved films if TMDB fails. |
| Movie data | TMDB | Titles, years, and posters. Only the Edge Function calls it. |
| Database | Supabase Postgres | Profiles, movies, watched lists with rank positions, and reviews. Row-level security on every table and the `save_ranking` function enforce that people can only change their own data. |
| CI | GitHub Actions | Build, Jest, database tests, and the Python prototype on every pull request. |

The app calls Supabase directly with the publishable key, so the security boundary is the database's access rules, not app code. A separate Encore API server (`server/`, Node.js) is deferred until the server-side ranking re-check and rate limits need it; when it arrives, only `app/src/services/` changes. The [living document](docs/living-document.md#7-software-architecture) has the diagram and the reasons.

## Repository layout

```text
README.md                         Project overview and entry point
CONTRIBUTING.md                   Branches, commits, pull requests, and how to file bugs
package.json                      setup, build, start, and test scripts; dev dependencies (including the Supabase CLI)
scripts/setup.mjs                 One-time setup: checks Node and installs root and app dependencies
jest.config.js                    Jest configuration (finds every *.test.ts file)
.github/workflows/ci.yml          CI: build, tests, app typecheck and lint on pull requests and pushes to main
.github/ISSUE_TEMPLATE/           Bug report template
app/                              Expo app (own package.json)
  .env.development                The team dev project's URL and publishable key (override in .env.local)
  src/app/                        Screens (Expo Router): sign-in, My List and Search tabs, Rank, Review, and About modals
  src/components/                 Shared display components (MovieCard, ComparisonPair, ErrorBanner, ...)
  src/hooks/                      One hook per screen; holds state, loading, errors, and retries
  src/services/                   Typed Supabase calls (auth, movies, watched list, reviews, rankings)
  src/ranking/                    Step-by-step binary-insertion engine and its Jest tests
  src/types/database.ts           Database types generated from the schema
docs/
  living-document.md              Requirements, process, architecture, design, and coding guidelines
  setup.md                        Running the app, Supabase setup, demo account, and schema changes
  movie-search.md                 How TMDB search works, running and changing it, and troubleshooting
  testing.md                      Running tests, adding tests, and how CI works
prototype/
  ranking.py                      Interactive binary-insertion ranking experiment
  test_ranking.py                 Ranking correctness and comparison-count checks
  ranking.ts                      TypeScript reference for binary insertion
  ranking.test.ts                 Jest tests for the TypeScript reference
ui-mockup/
  index.html                      Clickable UI mockup (open in a browser; sample data only)
supabase/
  config.toml                     Supabase CLI configuration
  migrations/
    20261014000000_initial.sql    Core tables and access policies
    20261028000000_mvp_ranking.sql  Profile on sign-up, default owners, atomic save_ranking function
    20261029000000_sample_films_to_tmdb.sql  Relabels the starter films with their TMDB IDs
    20261029010000_starter_film_posters.sql  Fills in posters for the starter films
    20261111000000_close_rank_gaps.sql       Renumbers a ranking when a movie is removed from the watched list
  functions/search-movies/        Edge Function: TMDB search that saves results (logic in search.ts and tmdb.ts, Jest-tested)
  seed.sql                        50 starter films with TMDB IDs
  demo/demo-account.sql           Fills a demo account with a ranked list and a review
  tests/                          Starter-catalog consistency test (Jest) and database tests (run-database-tests.sh)
```

The [UI mockup](ui-mockup/index.html) is a single self-contained page showing the My List, Feed, Rank, For You and Search screens, including the head-to-head ranking flow. The app builds the MVP parts of it: My List, Search, and Rank.

## Try the ranking prototype

With Python 3.10 or newer, from the repository root:

```sh
python3 prototype/ranking.py
```

The prototype ranks sample titles in the terminal, without a movie API or database, and keeps the list only for the session. It's a reference for the app's TypeScript engine, not app code. Its tests run with the [other suites](#test).

## Contributing and bugs

[CONTRIBUTING.md](CONTRIBUTING.md) explains the workflow:
- **Version control:** branch from `main` with a prefix such as `feature/` or `fix/`, write descriptive commits, and open a pull request. The "Protect main" ruleset requires a PR and passing CI checks, and blocks force-pushes. Every PR gets one review from a teammate, and any PR that changes setup or behavior updates the relevant doc.
- **Bug tracking:** file bugs in [GitHub Issues](https://github.com/Davidtm6/Encore/issues) with **New issue → Bug report**. The template asks for steps to reproduce, expected and actual behavior, the use case, the device, and severity. Bugs are triaged at the weekly planning meeting, and each fix gets a regression test.
- **Code style:** Google TypeScript Style Guide and Airbnb React/JSX Style Guide; see [coding guidelines](docs/living-document.md#9-coding-guidelines). Today, `npm run build` enforces ESLint with `eslint-config-expo` and the TypeScript compiler.
