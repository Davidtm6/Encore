## What changed and why

<!-- Link the issue with "Closes #<number>". -->

## How it was tested

<!-- Commands you ran, and what you checked in the running app. Say what you did not check. -->

## After merging

A merged change to the backend is not live until someone with Supabase access applies it, so testers keep seeing the old behavior (see #54). Tick what applies, and say who will do it.

- [ ] Nothing to apply: this PR doesn't touch `supabase/functions/` or `supabase/migrations/`
- [ ] Redeploy the function: `npx supabase functions deploy search-movies --use-api`
- [ ] Push the migration: `npx supabase db push`, then regenerate `app/src/types/database.ts` if the schema changed
- [ ] Checked in the running app that the change is visible
