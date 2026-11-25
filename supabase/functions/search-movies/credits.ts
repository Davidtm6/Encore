/**
 * Directors from TMDB's credits (#61). TMDB's search results don't include
 * the director, and asking for credits is one TMDB call per film, so the app
 * asks for them only for films on the user's list, and only once per film:
 * the director is saved in public.movies. No Deno or Supabase code, so Jest
 * can test it; index.ts passes in the real calls.
 */

import { TMDB_API } from './search.ts';

/** Most films looked up in one request, to stay well inside TMDB's rate limit. */
export const MAX_DIRECTOR_LOOKUPS = 20;

/** A saved film as the director lookup reads it. */
export interface DirectorTarget {
  id: number;
  provider: string;
  provider_movie_id: string;
  director: string | null;
}

/** What fillDirectors needs from the outside world. */
export interface DirectorDeps {
  /** Calls TMDB. Throws when TMDB is unreachable or answers with an error. */
  fetchTmdb(url: string): Promise<unknown>;
  /** Reads these films from public.movies; ids that don't exist are left out. */
  loadMovies(ids: number[]): Promise<DirectorTarget[]>;
  /** Saves one film's director. */
  saveDirector(id: number, director: string): Promise<void>;
  logError(message: string, error: unknown): void;
}

/** One film's director as the app receives it, or null when TMDB has none (or couldn't be asked). */
export interface FilmDirector {
  id: number;
  director: string | null;
}

/** TMDB's credits endpoint for a film. */
export function creditsUrl(tmdbId: string): string {
  return `${TMDB_API}/movie/${encodeURIComponent(tmdbId)}/credits?language=en-US`;
}

/**
 * The director's name from a TMDB credits response: the crew members whose
 * job is "Director", in TMDB's order, joined with ", ". Null when there are none.
 */
export function directorName(credits: unknown): string | null {
  const crew = (credits as { crew?: unknown } | null)?.crew;
  if (!Array.isArray(crew)) {
    return null;
  }
  const names = crew
    .filter((member) => member?.job === 'Director' && typeof member.name === 'string')
    .map((member) => (member.name as string).trim())
    .filter(Boolean);
  return names.length > 0 ? [...new Set(names)].join(', ') : null;
}

/**
 * The film ids from a `{ directorsFor: [...] }` request body: whole positive
 * numbers, without repeats, at most MAX_DIRECTOR_LOOKUPS. Null when the body
 * isn't a director request, so it's treated as a search.
 */
export function readDirectorIds(body: unknown): number[] | null {
  const ids = (body as { directorsFor?: unknown } | null)?.directorsFor;
  if (!Array.isArray(ids)) {
    return null;
  }
  const valid = ids.filter((id): id is number => Number.isSafeInteger(id) && id > 0);
  return [...new Set(valid)].slice(0, MAX_DIRECTOR_LOOKUPS);
}

/**
 * Looks up and saves the director of each film that doesn't have one yet, and
 * returns every requested film's director. A film whose lookup fails keeps a
 * null director and can be tried again later; the others are unaffected.
 */
export async function fillDirectors(ids: readonly number[], deps: DirectorDeps): Promise<FilmDirector[]> {
  if (ids.length === 0) {
    return [];
  }
  const movies = await deps.loadMovies([...ids]);
  return Promise.all(
    movies.map(async (movie): Promise<FilmDirector> => {
      if (movie.director !== null || movie.provider !== 'tmdb') {
        return { id: movie.id, director: movie.director };
      }
      try {
        const director = directorName(await deps.fetchTmdb(creditsUrl(movie.provider_movie_id)));
        if (director) {
          await deps.saveDirector(movie.id, director);
        }
        return { id: movie.id, director };
      } catch (error) {
        deps.logError(`Looking up the director of movie ${movie.id} failed.`, error);
        return { id: movie.id, director: null };
      }
    }),
  );
}
