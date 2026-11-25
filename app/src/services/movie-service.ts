import { userError } from '@/services/errors';
import { searchErrorMessage } from '@/services/search-error';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

/** `director` is null until it's looked up (see lookUpDirectors), or when TMDB has none. */
export type Movie = Pick<Tables<'movies'>, 'id' | 'title' | 'release_year' | 'poster_url' | 'director'>;

/**
 * A search result: a movie plus the start of TMDB's plot summary, when TMDB
 * answered, and TMDB's audience score (#85). The score is only shown in
 * search, so it isn't part of MOVIE_FIELDS: on My List it could pull people's
 * own rankings toward the crowd's.
 */
export type SearchResult = Movie & {
  overview?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
};

export const MOVIE_FIELDS = 'id, title, release_year, poster_url, director';

/** What a search found. */
export interface SearchOutcome {
  movies: SearchResult[];
  /** Near matches for a query that found nothing, nearest first. */
  suggestions: SearchResult[];
  /** True when TMDB couldn't be used, so `movies` is only films already saved, without plot lines. */
  fromSaved: boolean;
  /** When the query is an actor's or director's name, their films, best known first (#81). */
  person: PersonFilms | null;
}

/** A person's films: "Films with …" for an actor, "Films by …" for a director. */
export interface PersonFilms {
  name: string;
  role: 'actor' | 'director';
  movies: SearchResult[];
}

/**
 * Searches TMDB through the search-movies Edge Function, which saves the results
 * so they can be marked watched. An empty query returns TMDB's popular movies,
 * and a person's name also returns their films.
 */
export async function searchMovies(query: string): Promise<SearchOutcome> {
  const { data, error } = await supabase.functions.invoke<{
    movies: SearchResult[];
    suggestions?: SearchResult[];
    fromSaved?: boolean;
    person?: PersonFilms;
  }>('search-movies', {
    body: { query: query.trim() },
  });
  if (error) {
    throw new Error(await searchErrorMessage(error));
  }
  return {
    movies: data?.movies ?? [],
    suggestions: data?.suggestions ?? [],
    fromSaved: data?.fromSaved === true,
    person: data?.person?.movies?.length ? data.person : null,
  };
}

/**
 * Asks the search-movies function to look up and save the directors of these
 * films (at most 20 per call) from TMDB, and returns each one's director, or
 * null when TMDB has none. Each lookup is a TMDB call, so this is for films on
 * the user's list, not every search result.
 */
export async function lookUpDirectors(movieIds: number[]): Promise<Map<number, string | null>> {
  const { data, error } = await supabase.functions.invoke<{ directors: { id: number; director: string | null }[] }>(
    'search-movies',
    { body: { directorsFor: movieIds } },
  );
  if (error) {
    throw new Error(await searchErrorMessage(error));
  }
  return new Map((data?.directors ?? []).map(({ id, director }) => [id, director]));
}

export async function getMovie(movieId: number): Promise<Movie> {
  const { data, error } = await supabase.from('movies').select(MOVIE_FIELDS).eq('id', movieId).single();
  if (error) {
    throw userError(error, 'That movie couldn’t be loaded. Try again.');
  }
  return data;
}
