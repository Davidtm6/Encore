/**
 * The search-movies logic without Deno or Supabase, so Jest can test it.
 * index.ts passes in the real TMDB and database calls.
 */

import { type MovieRow, shortOverview, type TmdbMovie, toMovieRows } from './tmdb.ts';
import { closestTitles, looserQueries } from './typo.ts';

export const TMDB_API = 'https://api.themoviedb.org/3';
export const MAX_QUERY_LENGTH = 100;
export const SEARCH_UNAVAILABLE = 'Search isn’t available right now. Try again.';

/** A movie as the app receives it. */
export interface Movie {
  id: number;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  /**
   * The start of TMDB's plot summary, so similar titles can be told apart.
   * Passed through from TMDB, not stored, so fallback results have none.
   */
  overview?: string | null;
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

/** What the app receives for a search that could be answered. */
export interface SearchBody {
  movies: Movie[];
  /**
   * Near matches for a query that found nothing, nearest first, shown under
   * "Did you mean". Left out when there are none.
   */
  suggestions?: Movie[];
  /**
   * True when TMDB couldn't be used and `movies` comes from the films already
   * saved, which have no overview. The app says so, so a missing plot line or
   * a short result list isn't a mystery.
   */
  fromSaved?: true;
}

export type SearchResult =
  | { status: 200; body: SearchBody }
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

/** Saves rows and returns them as the app's movies, in the rows' order, each with its overview. */
async function saveInOrder(rows: MovieRow[], results: readonly TmdbMovie[], deps: SearchDeps): Promise<Movie[]> {
  const overviews = new Map(results.map((result) => [String(result.id), shortOverview(result.overview)]));
  const saved = new Map((await deps.saveRows(rows)).map(({ provider_movie_id, ...movie }) => [provider_movie_id, movie]));
  return rows
    .map((row) => {
      const movie = saved.get(row.provider_movie_id);
      return movie && { ...movie, overview: overviews.get(row.provider_movie_id) ?? null };
    })
    .filter((movie) => movie !== undefined);
}

/**
 * Near matches for a query TMDB found nothing for: asks TMDB for looser
 * versions of it and keeps the titles closest to what was typed. A failure
 * here only means no suggestions, never a failed search.
 */
async function suggestMovies(query: string, deps: SearchDeps): Promise<Movie[]> {
  try {
    const answers = await Promise.all(
      looserQueries(query).map((looser) => deps.fetchTmdb(tmdbUrl(looser)).then(tmdbResults, () => [])),
    );
    const results = answers.flat();
    const rows = closestTitles(query, toMovieRows(results));
    return rows.length === 0 ? [] : await saveInOrder(rows, results, deps);
  } catch (error) {
    deps.logError('Looking for near matches failed.', error);
    return [];
  }
}

/**
 * Searches TMDB and saves the results so they can be marked watched, keeping
 * TMDB's order. A query that finds nothing gets near matches as suggestions.
 * If TMDB or saving fails, falls back to movies already saved.
 */
export async function searchMovies(query: string, deps: SearchDeps): Promise<SearchResult> {
  try {
    const results = tmdbResults(await deps.fetchTmdb(tmdbUrl(query)));
    const rows = toMovieRows(results);
    if (rows.length === 0) {
      const suggestions = query ? await suggestMovies(query, deps) : [];
      return { status: 200, body: suggestions.length > 0 ? { movies: [], suggestions } : { movies: [] } };
    }
    return { status: 200, body: { movies: await saveInOrder(rows, results, deps) } };
  } catch (error) {
    deps.logError('TMDB search failed; searching saved movies instead.', error);
  }
  try {
    return { status: 200, body: { movies: await deps.searchSaved(query), fromSaved: true } };
  } catch (error) {
    deps.logError('Searching saved movies failed.', error);
    return { status: 502, body: { error: SEARCH_UNAVAILABLE } };
  }
}
