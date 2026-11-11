/**
 * Turns TMDB movie results into rows for public.movies. This file has no
 * imports and no Deno APIs, so the root Jest config can test it.
 */

/** TMDB's image server with a poster size that suits list rows and the Rank screen. */
export const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';

/** The fields Encore reads from a TMDB movie result. */
export interface TmdbMovie {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  adult?: boolean;
}

/** Longest overview sent to the app, which shows the first two lines to tell similar films apart. */
export const MAX_OVERVIEW_LENGTH = 200;

/** TMDB's plot summary trimmed for a result row, cut at a word, or null when there is none. */
export function shortOverview(overview: string | undefined): string | null {
  const text = overview?.trim().replace(/\s+/g, ' ');
  if (!text) {
    return null;
  }
  if (text.length <= MAX_OVERVIEW_LENGTH) {
    return text;
  }
  const cut = text.slice(0, MAX_OVERVIEW_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

export interface MovieRow {
  provider: 'tmdb';
  provider_movie_id: string;
  title: string;
  release_year: number | null;
  poster_url: string | null;
}

/** Keeps TMDB's order and drops adult results, untitled results, and repeats. */
export function toMovieRows(results: readonly TmdbMovie[]): MovieRow[] {
  const seen = new Set<number>();
  const rows: MovieRow[] = [];
  for (const movie of results) {
    const title = movie.title?.trim();
    if (movie.adult || !title || seen.has(movie.id)) {
      continue;
    }
    seen.add(movie.id);
    rows.push({
      provider: 'tmdb',
      provider_movie_id: String(movie.id),
      title,
      release_year: releaseYear(movie.release_date),
      poster_url: movie.poster_path ? POSTER_BASE_URL + movie.poster_path : null,
    });
  }
  return rows;
}

/** Escapes LIKE wildcards so a search for "100%" matches the text literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function releaseYear(date: string | undefined): number | null {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) && year > 1800 ? year : null;
}
