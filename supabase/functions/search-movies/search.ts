/**
 * The search-movies logic without Deno or Supabase, so Jest can test it.
 * index.ts passes in the real TMDB and database calls.
 */

import { type MovieRow, type TmdbMovie, toMovieRows } from './tmdb.ts';

export const TMDB_API = 'https://api.themoviedb.org/3';
export const MAX_QUERY_LENGTH = 100;
export const SEARCH_UNAVAILABLE = 'Search isn’t available right now. Try again.';

/** A movie as the app receives it. */
export interface Movie {
  id: number;
  title: string;
  release_year: number | null;
  poster_url: string | null;
}

/** What searchMovies needs from the outside world. */
export interface SearchDeps {
  /** Calls TMDB. Throws when TMDB is unreachable or answers with an error. */
  fetchTmdb(url: string): Promise<unknown>;
  /** Upserts rows into public.movies and returns them with their ids. */
  saveRows(rows: MovieRow[]): Promise<(Movie & { provider_movie_id: string })[]>;
  /** The old title match on movies already saved. */
  searchSaved(query: string): Promise<Movie[]>;
  logError(message: string, error: unknown): void;
}

export type SearchResult =
  | { status: 200; body: { movies: Movie[] } }
  | { status: 502; body: { error: string } };

/** The search text from a request body: trimmed and capped, or '' for anything else. */
export function readQuery(body: unknown): string {
  const query = (body as { query?: unknown } | null)?.query;
  return typeof query === 'string' ? query.trim().slice(0, MAX_QUERY_LENGTH) : '';
}

/** TMDB's search endpoint for a query, or its popular list when the query is empty. */
export function tmdbUrl(query: string): string {
  if (!query) {
    return `${TMDB_API}/movie/popular?language=en-US&page=1`;
  }
  const params = new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' });
  return `${TMDB_API}/search/movie?${params}`;
}

/** The results array from a TMDB response, or [] when the response has none. */
export function tmdbResults(response: unknown): TmdbMovie[] {
  const results = (response as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? results : [];
}

/**
 * Searches TMDB and saves the results so they can be marked watched, keeping
 * TMDB's order. If TMDB or saving fails, falls back to movies already saved.
 */
export async function searchMovies(query: string, deps: SearchDeps): Promise<SearchResult> {
  try {
    const rows = toMovieRows(tmdbResults(await deps.fetchTmdb(tmdbUrl(query))));
    if (rows.length === 0) {
      return { status: 200, body: { movies: [] } };
    }
    const saved = new Map((await deps.saveRows(rows)).map(({ provider_movie_id, ...movie }) => [provider_movie_id, movie]));
    const movies = rows.map((row) => saved.get(row.provider_movie_id)).filter((movie) => movie !== undefined);
    return { status: 200, body: { movies } };
  } catch (error) {
    deps.logError('TMDB search failed; searching saved movies instead.', error);
  }
  try {
    return { status: 200, body: { movies: await deps.searchSaved(query) } };
  } catch (error) {
    deps.logError('Searching saved movies failed.', error);
    return { status: 502, body: { error: SEARCH_UNAVAILABLE } };
  }
}
