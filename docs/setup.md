# Development setup

## Ranking experiment

Install Python 3.10 or newer. From the repository root:

```sh
python3 prototype/ranking.py
python3 -m unittest discover -s prototype -v
```

No packages, credentials, or network access are required. Choose the preferred film in each matchup. Enter `q` to cancel; canceling does not change the list. The list lasts only for the current session.

## Run the app

The app is an Expo project in `app/` that talks to the team's shared Supabase development project. There is no Encore API yet; see [Not set up yet](#not-set-up-yet).

### Quick start

With Node.js installed, from the repository root:

```sh
npm run setup   # checks your Node version and installs everything
npm start       # starts the app; scan the QR code with Expo Go
```

No configuration is needed: `app/.env.development` already points at the team's Supabase project. The rest of this section explains each step and what to do when something goes wrong.

### Who needs what

| You want to | You need |
| --- | --- |
| Run the app | Node.js 24, `npm run setup`, and Expo Go on your phone. |
| Look at data, run SQL, or restore a paused project | The above, plus an invite to the Supabase organization. Ask Nathan. |
| Change the database schema or the search function | The above, plus the database password (ask privately; never commit it) and a linked CLI; see [Changing the schema](#changing-the-schema) and [Movie search (TMDB)](#movie-search-tmdb). |

### 1. Install Node.js 24 and the dependencies

Use Node.js 24, the version in `.nvmrc` and CI. `npm run setup` stops on Node versions older than 22. On versions React Native doesn't officially support, such as 25, it warns and continues.

- **macOS with Homebrew:** `brew install node@24`, then add `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"` to `~/.zshrc` and open a new terminal.
- **nvm or fnm (macOS or Linux):** run `nvm use` or `fnm use` from the repository root; both read `.nvmrc`.
- **Windows:** install [nvm-windows](https://github.com/coreybutler/nvm-windows), then run `nvm install 24` and `nvm use 24`.

Check with `node -v` (it should print `v24.…`). Then run `npm run setup` from the repository root. It runs `npm install` in the root (Jest and the Supabase CLI) and in `app/`.

npm 11 may say that install scripts for `unrs-resolver` or `@parcel/watcher` aren't approved. That's expected. Those scripts are optional fallbacks, and nothing in the project needs them.

Install [Expo Go](https://expo.dev/go) on your phone and keep it updated; the app needs the version for Expo SDK 58. You can use the Android emulator instead, or the iOS Simulator (macOS with Xcode only).

### 2. Create the Supabase project (already done for the team)

The team's dev project exists, so skip this unless you need a new one.

1. Create a free project at <https://supabase.com/dashboard>, with **Enable Data API** on, the `public` schema, and automatic RLS on. Save the database password.
2. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. The first demo signs users in right after sign-up; email verification comes back before tester releases.
3. Link the repository and apply the schema and starter films, from the repository root:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```

   `db push` applies every file in `supabase/migrations/`. `--include-seed` also runs `supabase/seed.sql`, which adds 50 starter films and is safe to run again.

### 3. Start the app

`app/.env.development` holds the team project's URL and publishable key, and Expo loads it automatically. It's committed on purpose. The publishable key is meant to ship inside the app, and row-level security limits every user to their own data. Never put the secret key in any `app/.env` file. To point your copy at a different project, such as a local Supabase stack, put the same two keys in `app/.env.local`. It overrides `.env.development` and stays out of git.

From the repository root:

```sh
npm start           # tunnel: works on any network, including eduroam
npm run start:lan   # faster reloads when your phone and laptop share a home Wi-Fi
```

Inside `app/`, `npm start` is the LAN mode and `npm run start:tunnel` is the tunnel. Open the app on your phone:
- **iPhone:** scan the QR code with the Camera app, then tap **Open in Expo Go**.
- **Android:** scan the QR code from inside Expo Go. The system camera says "no usable data found".

You can also press `i` (iOS Simulator) or `a` (Android emulator). Troubleshooting:
- **The app shows a red screen about `EXPO_PUBLIC_SUPABASE_URL`:** restart with `npx expo start -c` in `app/` to clear the cache.
- **The tunnel won't connect:** try `npm run start:lan` on a home network.

### 4. Prepare a demo account

In the app, sign up with the username `demo`. Then open `supabase/demo/demo-account.sql` in the dashboard's **SQL Editor** and run it. The account now has 10 ranked films, 3 watched but unranked, and one review. The script replaces that account's list each time it runs, so run it right before a demo, not while a teammate is using the account. To prepare a different account, change `demo_username` at the top.

### Demo script

1. Sign up a new account. Search, mark a film watched, and rank it: it becomes #1 with no comparisons.
2. Sign in as `demo`. Rank an unranked film; it takes about 4 comparisons. Cancel one ranking partway and check that the list didn't change.
3. Re-rank a film. Write a review, then edit it.
4. Close and reopen the app; you're still signed in. Sign out and back in; everything is still there.

## The shared development database

Everyone's app talks to the same Supabase project:
- **Accounts:** usernames are unique across the team, so each person signs up with their own.
- **Pausing:** free projects pause after about a week without activity. Anyone in the organization can restore one from the dashboard; it takes a few minutes. Check the day before a demo.

## Movie search (TMDB)

Search calls the `search-movies` Edge Function in `supabase/functions/search-movies/`:
- It asks TMDB for matching movies, or for popular movies when the search box is empty.
- It saves each result into `movies`, so it can be marked watched, ranked, and reviewed.
- It returns the results in TMDB's order.
- If TMDB is unavailable, it searches the movies already saved instead.

The TMDB token lives only in Supabase's secrets, never in the app or the repository. Teammates who only run the app need nothing for this. To set it up for a project (already done for the team project), from the repository root:

1. Create a [TMDB](https://www.themoviedb.org) account. Under **Settings → API**, request a developer key for non-commercial use, and copy the **API Read Access Token**.
2. Store it as a secret: `npx supabase secrets set TMDB_READ_ACCESS_TOKEN=<token>`.
3. Deploy the function: `npx supabase functions deploy search-movies --use-api`. `--use-api` bundles on Supabase's servers, so Docker isn't needed.

Deploy function changes only after their pull request merges, the same as migrations. To see errors, open the dashboard: **Edge Functions → search-movies → Logs**.

TMDB's API is free for non-commercial use as long as the app credits it. The About screen (`app/src/app/about.tsx`) shows TMDB's logo and the notice "This product uses the TMDB API but is not endorsed or certified by TMDB"; keep both if you change that screen.

## Changing the schema

Rules for the shared database:
- **Push only after merging.** Push a migration only after its pull request merges into `main`. A migration pushed from a branch puts the shared database ahead of everyone else's code, and their app breaks.
- **One person pushes.** Alex, as backend owner, pushes migrations unless the team agrees otherwise.
- **Never edit a pushed migration.** Add a new file to `supabase/migrations/` instead.

The CLI link is stored per machine (in `supabase/.temp/`, which is gitignored), so link once on each computer. You'll need the database password. Then, from the repository root:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase gen types typescript --project-id <project-ref> --schema public > app/src/types/database.ts
```

`app/src/types/database.ts` is generated; don't edit it by hand. Commit the migration and the regenerated types together.

The ranking save is the `save_ranking(p_order bigint[])` database function. It checks that the new order contains every movie that was already ranked and only movies the caller has watched. It then rewrites all positions in one statement, so a save either fully succeeds or changes nothing. New accounts get a `profiles` row from the `on_auth_user_created` trigger.

## Local Supabase (optional)

A local stack needs Docker or another Docker-compatible container runtime. It lets you try migrations without touching the shared database. `supabase/config.toml` is already committed. From the repository root:

```sh
npx supabase start
npx supabase db reset
```

`db reset` recreates the **local** database, applies the migrations, and runs `seed.sql`. It deletes local development data. Do not add remote-target flags to it. To use the local stack, put the API URL and publishable key that `start` prints into `app/.env.local`; delete that file to go back to the shared project. Stop the stack with `npx supabase stop`.

## Not set up yet

The first demo leaves these for later increments:
- The Encore API (`server/`): the app calls Supabase directly, and RLS policies plus `save_ranking` enforce ownership.
- Required email verification.
- The 100-matchups-per-hour limit.
- The review content filter.
- Password reset.
- Maestro system tests.
- EAS builds with TestFlight and Google Play internal testing.

Keep environment files and credentials out of version control. The root `.gitignore` already ignores `.env` files at any depth.
