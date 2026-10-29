import { userError } from '@/services/errors';
import { searchErrorMessage } from '@/services/search-error';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Movie = Pick<Tables<'movies'>, 'id' | 'title' | 'release_year' | 'poster_url'>;

export const MOVIE_FIELDS = 'id, title, release_year, poster_url';

/**
 * Searches TMDB through the search-movies Edge Function, which saves the results
 * so they can be marked watched. An empty query returns TMDB's popular movies.
 */
export async function searchMovies(query: string): Promise<Movie[]> {
  const { data, error } = await supabase.functions.invoke<{ movies: Movie[] }>('search-movies', {
    body: { query: query.trim() },
  });
  if (error) {
    throw new Error(await searchErrorMessage(error));
  }
  return data?.movies ?? [];
}

export async function getMovie(movieId: number): Promise<Movie> {
  const { data, error } = await supabase.from('movies').select(MOVIE_FIELDS).eq('id', movieId).single();
  if (error) {
    throw userError(error, 'That movie couldn’t be loaded. Try again.');
  }
  return data;
}
