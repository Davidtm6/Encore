import { userError } from '@/services/errors';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Movie = Pick<Tables<'movies'>, 'id' | 'title' | 'release_year' | 'poster_url'>;

export const MOVIE_FIELDS = 'id, title, release_year, poster_url';

/** Title search over the catalog. An empty query lists the first films alphabetically. */
export async function searchMovies(query: string): Promise<Movie[]> {
  const text = query.trim();
  const all = supabase.from('movies').select(MOVIE_FIELDS);
  const matching = text ? all.ilike('title', `%${escapeLike(text)}%`) : all;
  const { data, error } = await matching.order('title').limit(25);
  if (error) {
    throw userError(error, 'Search isn’t available right now. Try again.');
  }
  return data;
}

export async function getMovie(movieId: number): Promise<Movie> {
  const { data, error } = await supabase.from('movies').select(MOVIE_FIELDS).eq('id', movieId).single();
  if (error) {
    throw userError(error, 'That movie couldn’t be loaded. Try again.');
  }
  return data;
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
