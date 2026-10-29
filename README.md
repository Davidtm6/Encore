# Encore

Encore is a social movie-ranking mobile app for iOS and Android built for CSE 403. Instead of assigning stars or numerical scores, users choose between two movies in head-to-head comparisons to build a personal best-to-worst list, and write one editable review per movie.

Team: Alexander Knotwell, David Tong, Lucas Mesfin, Pavan Chaganti, and Nathan Simon. Roles, schedule, and process are in the [living document](docs/living-document.md).

## MVP

1. Create an account and sign in.
2. Search movies and mark them watched.
3. Rank and re-rank movies through comparisons.
4. Write and edit one review per watched movie.

Friendships with shared reviews and comments, and personalized recommendations, are stretch goals that start only after the MVP passes its tests.

## Stack

| Part | Technology |
| --- | --- |
| App | React Native (TypeScript) with Expo; Expo Go for development; EAS Build, with TestFlight (iOS) and Google Play internal testing (Android) for testers |
| Ranking engine | TypeScript, runs in the app and is re-checked on the server |
| Encore API | Node.js + TypeScript |
| Auth and database | Supabase Auth and Postgres with row-level security |
| Movie data | TMDB, with a seeded sample catalog for testing |
| CI | GitHub Actions running Jest (with React Native Testing Library) and Maestro |

## Current progress

The first demo covers all four MVP features in the Expo app (`app/`):
- **Accounts:** sign up, sign in, and sign out; the session survives restarts.
- **Search:** find a film in a 50-film sample catalog and mark it watched.
- **Ranking:** rank and re-rank through head-to-head comparisons, with cancel.
- **Reviews:** write and edit one review per film.

The app talks to a Supabase development project directly. RLS policies and the `save_ranking` database function enforce that people can only change their own data. Rankings save atomically.

Deferred to later increments:
- The Encore API (`server/`) and live TMDB search.
- Required email verification and rate limits.
- EAS, TestFlight, and Google Play builds.

GitHub Actions runs the Jest and Python tests and type-checks and lints the app on every pull request.

## Run the app

With Node.js 24 installed, from the repository root:

```sh
npm run setup   # checks Node and installs the root and app dependencies
npm start       # starts the app over a tunnel; scan the QR code with Expo Go
```

The app already points at the team's Supabase development project through `app/.env.development`, so there's nothing to configure. The [setup guide](docs/setup.md#run-the-app) covers the following:
- installing Node 24;
- troubleshooting;
- the demo account and demo script;
- creating a new Supabase project;
- the rules for changing the shared schema.

## Repository layout

```text
README.md                         Project overview and entry point
package.json                      setup, start, and test scripts; dev dependencies (including the Supabase CLI)
scripts/setup.mjs                 One-time setup: checks Node and installs root and app dependencies
jest.config.js                    Jest configuration (finds every *.test.ts file)
.github/workflows/ci.yml          CI: tests, app typecheck and lint on pull requests and pushes to main
app/                              Expo app (own package.json)
  .env.development                The team dev project's URL and publishable key (override in .env.local)
  src/app/                        Screens (Expo Router): sign-in, My List and Search tabs, Rank and Review modals
  src/components/                 Shared display components (MovieCard, ComparisonPair, ErrorBanner, ...)
  src/hooks/                      One hook per screen; holds state, loading, errors, and retries
  src/services/                   Typed Supabase calls (auth, movies, watched list, reviews, rankings)
  src/ranking/                    Step-by-step binary-insertion engine and its Jest tests
  src/types/database.ts           Database types generated from the schema
docs/
  living-document.md              Requirements, process, architecture, design, and coding guidelines
  setup.md                        Running the app, Supabase setup, demo account, and schema changes
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
  seed.sql                        50 sample films
  demo/demo-account.sql           Fills a demo account with a ranked list and a review
```

The [UI mockup](ui-mockup/index.html) is a single self-contained page showing the My List, Feed, Rank, For You and Search screens, including the head-to-head ranking flow. The app builds the MVP parts of it: My List, Search, and Rank.

## Try the ranking prototype

With Python 3.10 or newer installed, run these commands from the repository root:

```sh
python3 prototype/ranking.py
python3 -m unittest discover -s prototype -v
```

The prototype uses sample titles and runs in the terminal. It demonstrates ranking behavior without a movie API or database; rankings are kept in memory for the session. The app's ranking engine will be written in TypeScript.

## Run the tests

With Node.js 24 installed (see `.nvmrc`):

```sh
npm install
npm test
```

See [testing](docs/testing.md) for running a single test, adding a new one, and how CI reports results.

## Contributing

Code follows the Google TypeScript Style Guide (enforced with `gts`) and the Airbnb React/JSX Style Guide; see [coding guidelines](docs/living-document.md#9-coding-guidelines). Every PR gets one review, and any PR that changes setup or behavior updates the relevant doc.
