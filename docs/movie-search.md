# Movie search

How Encore finds movies, where they're stored, and how to run, change, and fix it. For first-time app setup, see [setup](setup.md); for the test suites, see [testing](testing.md).

## How it works

Search uses [TMDB](https://www.themoviedb.org) (The Movie Database) through a Supabase Edge Function. The app never talks to TMDB directly.

```text
Search screen ──invoke('search-movies')──► Edge Function ──GET──► TMDB API
                                               │
                                               │ upsert results (admin client)
                                               ▼
                                         public.movies ◄── watched_movies, reviews
```

1. The Search screen waits for a 400 ms pause in typing, then calls the `search-movies` function with `{ query }`. supabase-js attaches the signed-in user's token.
2. The function checks the token, so only signed-in users can search. It then asks TMDB:
   - `/search/movie` for a query, with adult results excluded;
   - `/movie/popular` when the query is empty.
3. It turns TMDB's results into `movies` rows and upserts them. The rows are keyed by `(provider, provider_movie_id)` = `('tmdb', <TMDB id>)`, so each film is stored once, and a repeat search refreshes its title, year, and poster.
4. It returns the saved rows, with Encore's own `id`, in TMDB's order. The app needs that `id` to mark a movie watched, rank it, or review it.

**Why go through a function?** There are three reasons:
- **The token stays secret.** The TMDB token lives in Supabase's secrets. Anything in the app, including `app/.env`, can be pulled out of the app bundle.
- **Results can be saved.** The app has no write access to `movies` (row-level security), so only the function, with the admin client, can save TMDB's results.
- **Every film the app shows exists in `movies`.** `watched_movies` and `reviews` need a real row to point at.

## The pieces

| File | Role |
| --- | --- |
| `app/src/services/movie-service.ts` | `searchMovies(query)` calls the function; `getMovie(id)` reads one saved movie |
| `app/src/services/search-error.ts` | The message Search shows when the call fails |
| `app/src/hooks/use-movie-search.ts` | Debounce, loading, error, and retry state for the Search screen |
| `app/src/app/(tabs)/search.tsx` | The Search screen, including the "Popular right now" list |
| `app/src/app/about.tsx` | The attribution TMDB's terms require (see [TMDB's terms](#tmdbs-terms)) |
| `supabase/functions/search-movies/index.ts` | The Edge Function: sign-in check, the TMDB request (5-second timeout), and the database calls |
| `supabase/functions/search-movies/search.ts` | The search logic: reading the query, building the TMDB URL, saving, ordering, and the fallback. It has no Deno or Supabase code, so Jest tests it. |
| `supabase/functions/search-movies/tmdb.ts` | Turning TMDB results into `movies` rows |
| `supabase/config.toml` (`[functions.search-movies]`) | The function's settings, including `verify_jwt` |
| `supabase/migrations/20261029000000_sample_films_to_tmdb.sql` | Gave the 50 starter films their TMDB IDs |
| `supabase/migrations/20261029010000_starter_film_posters.sql` | Gave the 50 starter films their posters |
| `supabase/seed.sql` | The 50 starter films for fresh databases, with TMDB IDs and posters |

## The function's contract

**Request:** `POST /functions/v1/search-movies` with a signed-in user's token and a JSON body `{ "query": "parasite" }`. Leading and trailing spaces are trimmed, and the query is cut to 100 characters. A missing or non-text `query` counts as empty.

**Responses:**

| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "movies": [{ "id", "title", "release_year", "poster_url" }] }` | Normal results, in TMDB's order. `release_year` and `poster_url` can be `null`. |
| 200 | `{ "movies": [...] }` from saved movies | TMDB failed; see below |
| 401 | An auth error | No valid signed-in token. The app shows "Your session expired." |
| 502 | `{ "error": "Search isn’t available right now. Try again." }` | TMDB and the fallback both failed |

## How movies are stored

- `provider` is `'tmdb'` and `provider_movie_id` is TMDB's ID as text. The pair is unique.
- `poster_url` is a full URL at TMDB's `w342` size, for example `https://image.tmdb.org/t/p/w342/<file>.jpg`, or `null` when TMDB has no poster. The app shows a colored tile with the title's initials when it's `null`.
- `release_year` is the first four digits of TMDB's `release_date`, or `null`.
- `movies` grows as people search. Nothing deletes rows: a movie in someone's list can't be deleted (`on delete restrict`), and unused rows cost almost nothing.
- **The 50 starter films** came from `seed.sql` before search used TMDB, labeled `'sample'`. Two migrations converted them in place:
  - the first relabeled each one with its TMDB ID;
  - the second added posters, filling only empty ones.

  Each film kept its row `id`, so existing watched lists, rankings, and reviews still point at the right film.

## When something fails

The function tries to keep search working:

| What fails | What the user sees |
| --- | --- |
| TMDB is down, slow (over 5 seconds), rate-limited, or rejects the token | Results from movies already saved, matched by title. An empty query lists saved movies alphabetically instead of TMDB's popular list. |
| Saving TMDB's results fails | The same fallback |
| The fallback fails too | "Search isn’t available right now. Try again." with a Retry button |
| The phone can't reach Supabase | "Can't reach Encore. Check your connection and try again." |
| The sign-in has expired | "Your session expired. Sign out and sign back in." |

A fallback is easy to miss, because search still returns results. To check, look at the logs, described below.

## Running it

These steps need access to the team's Supabase organization and the Supabase CLI login. Run them from the repository root. Teammates who only run the app need none of this.

**Set or replace the TMDB token**
1. Get the **API Read Access Token** from TMDB, under **Settings → API**. The account is Nathan's.
2. Store it, keeping it out of your shell history:
   ```sh
   echo 'TMDB_READ_ACCESS_TOKEN=<token>' > /tmp/tmdb.env
   npx supabase secrets set --env-file /tmp/tmdb.env
   rm /tmp/tmdb.env
   ```
   The function reads the new value immediately; no redeploy is needed.
3. Check it's set with `npx supabase secrets list`. It shows names and hashes, never values.

If the token leaks, generate a new one in TMDB's API settings and set it again.

**Deploy the function**
```sh
npx supabase functions deploy search-movies --use-api
```
`--use-api` bundles on Supabase's servers, so Docker isn't needed. Deploy only after the pull request with the change merges, the same rule as migrations. The deploy uploads `index.ts` and the files it imports; the `*.test.ts` files stay out.

**See what it's doing:** open the dashboard, then **Edge Functions → search-movies**.
- **Logs** shows `console.error` output, such as "TMDB search failed; searching saved movies instead." with the reason.
- **Invocations** shows each call's status code.

**Limits:** TMDB rate-limits requests, and Supabase's free tier caps function calls per month. At class-project scale neither is close. The 400 ms debounce keeps typing to about one call per pause.

## TMDB's terms

TMDB's API is free for non-commercial use, which covers a class project, on three conditions:
- **The logo:** the app shows one of TMDB's approved logos, unmodified and less prominent than Encore's own name.
- **The notice:** it shows the exact text "This product uses the TMDB API but is not endorsed or certified by TMDB."
- **The placement:** both appear in an About or Credits section, and the app refers to TMDB only as "TMDB" or "The Movie Database".

The About screen (`app/src/app/about.tsx`, opened from My List) covers all three. The logo is `app/assets/images/tmdb-logo.svg`, from TMDB's [logos page](https://www.themoviedb.org/about/logos-attribution). Keep these if you change that screen. Any commercial use needs a license from TMDB.

## Testing

| Test | What it checks |
| --- | --- |
| `supabase/functions/search-movies/search.test.ts` | The function's logic with fake TMDB and database calls: the query, the URL, saving and ordering, and every fallback |
| `supabase/functions/search-movies/tmdb.test.ts` | How TMDB results become rows |
| `app/src/services/search-error.test.ts` | The error messages Search shows |
| `supabase/tests/starter-catalog.test.ts` | That the seed, both TMDB migrations, and the demo script agree on the same 50 films and posters |
| `supabase/tests/database/tmdb-migrations.test.sql` | Both migrations on the shared database's old state |
| `supabase/tests/database/starter-catalog.test.sql` | The seed and demo script on a fresh database |
| `npm run check:functions` | Type-checks the function with Deno |

Run them with `npm test`, `npm run test:db`, and `npm run check:functions`; CI runs all of them on every pull request.

What the tests can't check is the deployed function talking to the real TMDB and the real database. After deploying, check by hand in Expo Go:
1. Search for "parasite": the results show posters.
2. Clear the search box: "Popular right now" appears.
3. Mark a new result watched, then rank and review it.
4. Open My List → **About**: the logo and notice show.

## Changing it

- **Search logic or the row mapping:** edit `search.ts` or `tmdb.ts`, add or adjust tests, then run `npm test` and `npm run check:functions`. Deploy after merging.
- **Saving more fields** (genre, runtime, overview):
  1. Add the columns in a new migration.
  2. Extend `MovieRow` and `toMovieRows` in `tmdb.ts`, and the selected fields in `index.ts` and `movie-service.ts`.
  3. Regenerate `app/src/types/database.ts` (see [Changing the schema](setup.md#changing-the-schema)).

  Search results only include the fields TMDB's search returns. Genres come back as IDs, so names need TMDB's genre list.
- **Never call TMDB from the app.** Anything in the app or `app/.env` ships to every phone, token included.
- **The `verify_jwt` setting:** `verify_jwt = true` means Supabase rejects calls without a valid user token before the function runs. The function also checks the token itself, through `withSupabase({ auth: 'user' })`. If every call fails with "Invalid JWT" (possible with Supabase's newer signing keys), set it to `false` and redeploy; the function's own check still applies.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Every search says "Search isn’t available" | The function isn't deployed, or both TMDB and the database fail | Deploy it, then check the logs |
| Search works but new films never appear, and the empty search isn't TMDB's popular list | The fallback is running: TMDB is failing | Check the logs. A missing or rejected token means setting `TMDB_READ_ACCESS_TOKEN` again. |
| Everyone gets "Your session expired" or "Invalid JWT" | The platform JWT check | Set `verify_jwt = false` for `search-movies` in `supabase/config.toml` and redeploy |
| One user gets "Your session expired" | Their session ended | Sign out and back in |
| A starter film shows up twice | It was searched before its TMDB ID migration ran, so one copy is still labeled `'sample'` | Run `select * from public.movies where provider = 'sample';` in the SQL Editor and ask the backend owner to merge the two rows |
| Starter films show colored tiles instead of posters | The poster migration hasn't been pushed | Run `npx supabase db push` |
