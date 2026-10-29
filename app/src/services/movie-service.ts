import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { OFFLINE_MESSAGE, userError } from '@/services/errors';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Movie = Pick<Tables<'movies'>, 'id' | 'title' | 'release_year' | 'poster_url'>;

export const MOVIE_FIELDS = 'id, title, release_year, poster_url';

const SEARCH_UNAVAILABLE = 'Search isn’t available right now. Try again.';

/**
 * Searches TMDB through the search-movies Edge Function, which saves the results
 * so they can be marked watched. An empty query returns TMDB's popular movies.
 */
export async function searchMovies(query: string): Promise<Movie[]> {
  const { data, error } = await supabase.functions.invoke<{ movies: Movie[] }>('search-movies', {
    body: { query: query.trim() },
  });
  if (error) {
    throw await searchError(error);
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

async function searchError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsFetchError) {
    return new Error(OFFLINE_MESSAGE);
  }
  if (error instanceof FunctionsHttpError) {
    if (error.context.status === 401) {
      return new Error('Your session expired. Sign out and sign back in.');
    }
    const body = await error.context.json().catch(() => null);
    if (typeof body?.error === 'string') {
      return new Error(body.error);
    }
  }
  return new Error(SEARCH_UNAVAILABLE);
}
