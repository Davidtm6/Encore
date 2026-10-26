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

This repository holds early design and exploration work: the living document, a Python prototype of the binary-insertion ranking algorithm, a static UI mockup, and a draft Supabase migration. The Expo app (`app/`) and Encore API (`server/`) are not scaffolded yet.

## Repository layout

```text
README.md                         Project overview and entry point
docs/
  living-document.md              Requirements, process, architecture, design, and coding guidelines
  setup.md                        Prototype and local database setup instructions
prototype/
  ranking.py                      Interactive binary-insertion ranking experiment
  test_ranking.py                 Ranking correctness and comparison-count checks
ui-mockup/
  index.html                      Clickable UI mockup (open in a browser; sample data only)
supabase/
  migrations/
    20261014000000_initial.sql    Draft core tables and access policies
```

The [UI mockup](ui-mockup/index.html) is a single self-contained page showing the My List, Feed, Rank, For You and Search screens, including the head-to-head ranking flow. See the [setup guide](docs/setup.md) for resource setup and limitations.

## Try the ranking prototype

With Python 3.10 or newer installed, run these commands from the repository root:

```sh
python3 prototype/ranking.py
python3 -m unittest discover -s prototype -v
```

The prototype uses sample titles and runs in the terminal. It demonstrates ranking behavior without a movie API or database; rankings are kept in memory for the session. The app's ranking engine will be written in TypeScript.

## Contributing

Code follows the Google TypeScript Style Guide (enforced with `gts`) and the Airbnb React/JSX Style Guide; see [coding guidelines](docs/living-document.md#9-coding-guidelines). Every PR gets one review, and any PR that changes setup or behavior updates the relevant doc.
