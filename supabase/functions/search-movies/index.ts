// Movie search for signed-in users. Asks TMDB, saves the results into
// public.movies so they can be marked watched, and returns them in TMDB's
// order. An empty query returns TMDB's popular movies. If TMDB fails, it
// searches the movies already saved instead, so search keeps working.
// The logic lives in search.ts; this file connects it to TMDB and the database.
//
// Deploy: npx supabase functions deploy search-movies --use-api
// Needs the TMDB_READ_ACCESS_TOKEN secret; see docs/movie-search.md.

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { readQuery, searchMovies } from './search.ts';
import { escapeLike } from './tmdb.ts';

const MOVIE_FIELDS = 'id, title, release_year, poster_url';
const TMDB_TIMEOUT_MS = 5000;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const query = readQuery(await req.json().catch(() => null));
    const { status, body } = await searchMovies(query, {
      fetchTmdb,
      // The app can't write to movies; the admin client saves TMDB's data.
      saveRows: async (rows) => {
        const { data, error } = await ctx.supabaseAdmin
          .from('movies')
          .upsert(rows, { onConflict: 'provider,provider_movie_id' })
          .select(`${MOVIE_FIELDS}, provider_movie_id`);
        if (error) {
          throw error;
        }
        return data;
      },
      searchSaved: async (text) => {
        const all = ctx.supabase.from('movies').select(MOVIE_FIELDS);
        const matching = text ? all.ilike('title', `%${escapeLike(text)}%`) : all;
        const { data, error } = await matching.order('title').limit(25);
        if (error) {
          throw error;
        }
        return data;
      },
      logError: (message, error) => console.error(message, error),
    });
    return Response.json(body, { status });
  }),
};

async function fetchTmdb(url: string): Promise<unknown> {
  const token = Deno.env.get('TMDB_READ_ACCESS_TOKEN');
  if (!token) {
    throw new Error('The TMDB_READ_ACCESS_TOKEN secret is not set.');
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`TMDB responded with ${response.status}.`);
  }
  return response.json();
}
