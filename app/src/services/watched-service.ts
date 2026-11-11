import { userError } from '@/services/errors';
import { MOVIE_FIELDS, type Movie } from '@/services/movie-service';
import { supabase } from '@/services/supabase';

export interface WatchedMovie {
  movie: Movie;
  /** 1 is the favorite; null until the movie is ranked. */
  rankPosition: number | null;
  review: string | null;
}

/** The signed-in user's watched list: ranked films best first, then unranked, newest first. */
export async function listMyMovies(): Promise<WatchedMovie[]> {
  const { data, error } = await supabase
    .from('watched_movies')
    .select(`rank_position, movies(${MOVIE_FIELDS}), reviews(body)` as const)
    .order('rank_position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    throw userError(error, 'Your list couldn’t be loaded. Try again.');
  }
  return data.map((row) => ({
    movie: row.movies,
    rankPosition: row.rank_position,
    review: row.reviews?.body ?? null,
  }));
}

/** Adds a movie to the watched list. Returns false when it was already there. */
export async function markWatched(movieId: number): Promise<boolean> {
  const { error } = await supabase.from('watched_movies').insert({ movie_id: movieId });
  if (error?.code === '23505') {
    return false;
  }
  if (error) {
    throw userError(error, 'That movie couldn’t be added. Try again.');
  }
  return true;
}

/**
 * Takes a movie out of the watched list, along with its rank and review. The
 * database closes the gap in the ranking in the same statement (see
 * close_rank_gaps in supabase/migrations), and RLS limits this to the
 * signed-in user's own rows.
 */
export async function removeWatched(movieId: number): Promise<void> {
  const { error } = await supabase.from('watched_movies').delete().eq('movie_id', movieId);
  if (error) {
    throw userError(error, 'That movie couldn’t be removed. Try again.');
  }
}
