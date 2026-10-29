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

### Who needs what

| You want to | You need |
| --- | --- |
| Run the app | Node.js 24, `npm install`, the project URL and publishable key in `app/.env`, and Expo Go on your phone. Follow steps 1, 3, and 4. Step 2 is already done. |
| Look at data, run SQL, or restore a paused project | Steps above, plus an invite to the Supabase organization. Ask Nathan. |
| Change the database schema | Steps above, plus the database password (ask privately; never commit it) and a linked CLI; see [Changing the schema](#changing-the-schema). |

### 1. Install Node.js 24 and the dependencies

Use Node.js 24, the version in `.nvmrc` and CI. React Native 0.88 does not officially support Node 25, and `npm install` warns if your version is outside the supported range.

- **macOS with Homebrew:** `brew install node@24`, then add `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"` to `~/.zshrc` and open a new terminal.
- **nvm or fnm (macOS or Linux):** run `nvm use` or `fnm use` from the repository root; both read `.nvmrc`.
- **Windows:** install [nvm-windows](https://github.com/coreybutler/nvm-windows), then run `nvm install 24` and `nvm use 24`.

Check with `node -v` (it should print `v24.…`). Then, from the repository root:

```sh
npm install          # Jest and the Supabase CLI
cd app
npm install
```

Install [Expo Go](https://expo.dev/go) on your phone and keep it updated; the app needs the version for Expo SDK 58. You can use the Android emulator instead, or the iOS Simulator (macOS with Xcode only).

### 2. Create the Supabase project (already done for the team)

The team's dev project exists, so skip this unless you need a new one.

1. Create a free project at <https://supabase.com/dashboard>, with **Enable Data API** on, the `public` schema, and automatic RLS on. Save the database password.
2. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. The first demo signs users in right after sign-up; email verification comes back before tester releases.
3. Link the repository and apply the schema and sample films, from the repository root:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```

   `db push` applies every file in `supabase/migrations/`. `--include-seed` also runs `supabase/seed.sql`, which adds 50 sample films and is safe to run again.

### 3. Configure and start the app

From `app/`, copy the example environment file (`cp .env.example .env` on macOS or Linux, `copy .env.example .env` on Windows). Fill in two values: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Get them from the team's shared doc, or from **Project Settings → API Keys** if you're in the Supabase organization. Only the URL and the publishable key (`sb_publishable_…`) belong in the app; never put the secret key in `app/.env`. The repository is public, so `app/.env` is gitignored and the values are shared outside git.

```sh
npm start              # same Wi-Fi as your phone
npm run start:tunnel   # campus Wi-Fi (eduroam) or any network that blocks phone-to-laptop traffic
```

Open the app on your phone:
- **iPhone:** scan the QR code with the Camera app, then tap **Open in Expo Go**.
- **Android:** scan the QR code from inside Expo Go. The system camera says "no usable data found".

You can also press `i` (iOS Simulator) or `a` (Android emulator). The first tunnel run asks to install `@expo/ngrok`; say yes. If the app shows a red screen about `EXPO_PUBLIC_SUPABASE_URL`, `app/.env` is missing or wasn't picked up; restart with `npx expo start -c`.

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

`db reset` recreates the **local** database, applies the migrations, and runs `seed.sql`. It deletes local development data. Do not add remote-target flags to it. Point `app/.env` at the local API URL and publishable key that `start` prints. Stop the stack with `npx supabase stop`.

## Not set up yet

The first demo leaves these for later increments:
- The Encore API (`server/`): the app calls Supabase directly, and RLS policies plus `save_ranking` enforce ownership.
- Live TMDB search.
- Required email verification.
- The 100-matchups-per-hour limit.
- The review content filter.
- Password reset.
- Maestro system tests.
- EAS builds with TestFlight and Google Play internal testing.

Keep environment files and credentials out of version control. The root `.gitignore` already ignores `.env` files at any depth.
