import { userError } from '@/services/errors';
import { searchErrorMessage } from '@/services/search-error';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Movie = Pick<Tables<'movies'>, 'id' | 'title' | 'release_year' | 'poster_url'>;

/** A search result: a movie plus the start of TMDB's plot summary, when TMDB answered. */
export type SearchResult = Movie & { overview?: string | null };

export const MOVIE_FIELDS = 'id, title, release_year, poster_url';

/** What a search found. */
export interface SearchOutcome {
  movies: SearchResult[];
  /** Near matches for a query that found nothing, nearest first. */
  suggestions: SearchResult[];
  /** True when TMDB couldn't be used, so `movies` is only films already saved, without plot lines. */
  fromSaved: boolean;
}

/**
 * Searches TMDB through the search-movies Edge Function, which saves the results
 * so they can be marked watched. An empty query returns TMDB's popular movies.
 */
export async function searchMovies(query: string): Promise<SearchOutcome> {
  const { data, error } = await supabase.functions.invoke<{
    movies: SearchResult[];
    suggestions?: SearchResult[];
    fromSaved?: boolean;
  }>('search-movies', {
    body: { query: query.trim() },
  });
  if (error) {
    throw new Error(await searchErrorMessage(error));
  }
  return { movies: data?.movies ?? [], suggestions: data?.suggestions ?? [], fromSaved: data?.fromSaved === true };
}

export async function getMovie(movieId: number): Promise<Movie> {
  const { data, error } = await supabase.from('movies').select(MOVIE_FIELDS).eq('id', movieId).single();
  if (error) {
    throw userError(error, 'That movie couldn’t be loaded. Try again.');
  }
  return data;
}
