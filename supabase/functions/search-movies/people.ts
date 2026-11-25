/**
 * Search by actor or director (#81). When a query is a person's name, TMDB's
 * person search finds them and their movie credits list their films. No Deno
 * or Supabase code, so Jest can test it; search.ts makes the calls.
 */

import { TMDB_API, type TmdbMovie } from './tmdb.ts';

/** Most of a person's films returned, best known first. */
export const MAX_PERSON_FILMS = 20;

/** Shortest query that can be a name, so "an" or "up" doesn't pull up a stranger. */
export const MIN_NAME_QUERY_LENGTH = 3;

/** An actor's films are the ones they're in; a director's are the ones they directed. */
export type PersonRole = 'actor' | 'director';

const ROLES: Record<string, PersonRole | undefined> = { Acting: 'actor', Directing: 'director' };

export interface Person {
  id: number;
  name: string;
  role: PersonRole;
}

/** TMDB's person search for a query. */
export function personSearchUrl(query: string): string {
  const params = new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' });
  return `${TMDB_API}/search/person?${params}`;
}

/** TMDB's list of every film a person acted in or worked on. */
export function personFilmsUrl(personId: number): string {
  return `${TMDB_API}/person/${personId}/movie_credits?language=en-US`;
}

/**
 * The person the query names: TMDB's best match, if every word typed starts a
 * word of their name ("nolan" or "chris nolan" for Christopher Nolan) and they
 * are known for acting or directing. Null otherwise, so a title search like
 * "the matrix" doesn't also show some actor's films.
 */
export function matchingPerson(query: string, response: unknown): Person | null {
  const typed = words(query);
  if (typed.join(' ').length < MIN_NAME_QUERY_LENGTH) {
    return null;
  }
  const results = (response as { results?: unknown } | null)?.results;
  const best = Array.isArray(results) ? results[0] : undefined;
  if (!best || best.adult || !Number.isSafeInteger(best.id) || typeof best.name !== 'string') {
    return null;
  }
  const role = ROLES[best.known_for_department];
  const name = best.name.trim();
  const nameWords = words(name);
  if (!role || !typed.every((word) => nameWords.some((part) => part.startsWith(word)))) {
    return null;
  }
  return { id: best.id, name, role };
}

/**
 * A person's films from a TMDB movie-credits response: the ones they acted
 * in, or for a director the ones they directed. Most-voted first, so the best
 * known come first, and at most MAX_PERSON_FILMS. Repeats and adult films are
 * dropped later by toMovieRows.
 */
export function personFilms(role: PersonRole, response: unknown): TmdbMovie[] {
  const credits = response as { cast?: unknown; crew?: unknown } | null;
  const list = role === 'actor' ? credits?.cast : credits?.crew;
  if (!Array.isArray(list)) {
    return [];
  }
  const films: (TmdbMovie & { job?: string })[] = list.filter(
    (film) => film && Number.isSafeInteger(film.id) && (role === 'actor' || film.job === 'Director'),
  );
  const seen = new Set<number>();
  return films
    .filter((film) => !seen.has(film.id) && seen.add(film.id))
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .slice(0, MAX_PERSON_FILMS);
}

/** Lowercase words without accents or punctuation: "Bong Joon-ho" → ["bong", "joon", "ho"]. */
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
