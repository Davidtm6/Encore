# Development setup

## Local Supabase resources

Prerequisites: a running Docker-compatible container runtime and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). Follow the official installation instructions for your platform. With the global CLI installed, run from the repository root:

```sh
supabase init
supabase start
supabase db reset
```

`init` generates local configuration in `supabase/config.toml`. `start` launches local services. `db reset` recreates the **local** database and applies the supplied migration; it deletes local development data. Do not add remote-target flags to this command.

Open the Studio URL printed by the CLI and check that `profiles`, `movies`, `watched_movies`, and `reviews` exist. Use the local Auth tools to create test accounts. Then verify that an authenticated user can manage their own viewing records and reviews, cannot access another user’s private viewing history, and cannot write movie metadata. Populate sample movies through Studio’s administrative connection; provider writes are reserved for trusted server code.

The migration is an initial draft and has not been applied to a running database in this starter. Review and validate it before connecting an app. See the [official migration workflow](https://supabase.com/docs/guides/local-development/database-migrations).

Stop local services when finished:

```sh
supabase stop
```

## App, API, and hosted setup — next increment

The Expo app (`app/`) and Encore API (`server/`) are not scaffolded yet. Week 1 of the schedule covers:

1. Create the Expo app in TypeScript and run it in Expo Go, the iOS Simulator, and the Android emulator.
2. Create the Node.js + TypeScript Encore API and connect it to a separate Supabase development project.
3. Configure Supabase email confirmation and the app's Auth redirect URLs.
4. Load the 50-film sample catalog, then confirm TMDB terms and rate limits before switching search to the live provider.
5. Implement the atomic ranking save, verified-email checks, and the 100-matchups-per-hour limit on the server.
6. Set up GitHub Actions to run Jest on every pull request and Maestro before tester releases.
7. Set up the Apple Developer and Google Play developer accounts, and run first EAS builds with a TestFlight upload and a Play internal-testing upload.

Only the Supabase project URL and publishable key belong in app configuration. Keep the Supabase secret/service-role key and the TMDB key in server environment variables.

No hosted accounts, paid subscriptions, or builds have been created yet. Commit reviewed configuration and migrations to GitHub; keep environment files and credentials out of version control.
