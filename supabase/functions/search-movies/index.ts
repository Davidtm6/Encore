// Movie search for signed-in users. Asks TMDB, saves the results into
// public.movies so they can be marked watched, and returns them in TMDB's
// order. An empty query returns TMDB's popular movies. If TMDB fails, it
// searches the movies already saved instead, so search keeps working.
//
// Deploy: npx supabase functions deploy search-movies --use-api
// Needs the TMDB_READ_ACCESS_TOKEN secret; see docs/setup.md.

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { type SupabaseContext, withSupabase } from '@supabase/server';

import { escapeLike, toMovieRows, type TmdbMovie } from './tmdb.ts';

const TMDB_API = 'https://api.themoviedb.org/3';
const MOVIE_FIELDS = 'id, title, release_year, poster_url';
const TMDB_TIMEOUT_MS = 5000;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === 'string' ? body.query.trim().slice(0, 100) : '';

    try {
      const rows = toMovieRows(await fetchTmdb(query));
      if (rows.length === 0) {
        return Response.json({ movies: [] });
      }
      // The app can't write to movies; the admin client saves TMDB's data.
      const { data, error } = await ctx.supabaseAdmin
        .from('movies')
        .upsert(rows, { onConflict: 'provider,provider_movie_id' })
        .select(`${MOVIE_FIELDS}, provider_movie_id`);
      if (error) {
        throw error;
      }
      const saved = new Map(data.map(({ provider_movie_id, ...movie }) => [provider_movie_id, movie]));
      const movies = rows.map((row) => saved.get(row.provider_movie_id)).filter((movie) => movie !== undefined);
      return Response.json({ movies });
    } catch (error) {
      console.error('TMDB search failed; searching saved movies instead.', error);
      return searchSaved(ctx.supabase, query);
    }
  }),
};

async function fetchTmdb(query: string): Promise<TmdbMovie[]> {
  const token = Deno.env.get('TMDB_READ_ACCESS_TOKEN');
  if (!token) {
    throw new Error('The TMDB_READ_ACCESS_TOKEN secret is not set.');
  }
  const url = query
    ? `${TMDB_API}/search/movie?${new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' })}`
    : `${TMDB_API}/movie/popular?language=en-US&page=1`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`TMDB responded with ${response.status}.`);
  }
  const { results } = await response.json();
  return Array.isArray(results) ? results : [];
}

/** The search the app used before TMDB: a title match on saved movies. */
async function searchSaved(supabase: SupabaseContext['supabase'], query: string): Promise<Response> {
  const all = supabase.from('movies').select(MOVIE_FIELDS);
  const matching = query ? all.ilike('title', `%${escapeLike(query)}%`) : all;
  const { data, error } = await matching.order('title').limit(25);
  if (error) {
    console.error('Searching saved movies failed.', error);
    return Response.json({ error: 'Search isn’t available right now. Try again.' }, { status: 502 });
  }
  return Response.json({ movies: data });
}
