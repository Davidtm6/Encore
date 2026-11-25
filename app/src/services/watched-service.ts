import { readTier, scoresForList, type Tier } from '@/ranking/score';
import { currentUserId } from '@/services/auth-service';
import { userError } from '@/services/errors';
import { MOVIE_FIELDS, type Movie } from '@/services/movie-service';
import { supabase } from '@/services/supabase';

export interface WatchedMovie {
  movie: Movie;
  /** 1 is the favorite; null until the movie is ranked. */
  rankPosition: number | null;
  /** Loved it, okay, or didn't like it; null until the movie is ranked. */
  tier: Tier | null;
  /** 0.0–10.0 from the tier and the place within it; null until the movie is ranked. */
  score: number | null;
  review: string | null;
}

/** The signed-in user's watched list: ranked films best first, then unranked, newest first. */
export async function listMyMovies(): Promise<WatchedMovie[]> {
  return listWatched(await currentUserId(), 'Your list couldn’t be loaded. Try again.');
}

/**
 * One person's watched list, ordered as on My List. Friends can read each
 * other's lists, so this always filters by user: RLS alone would also return
 * every friend's rows.
 */
export async function listWatched(userId: string, failure: string): Promise<WatchedMovie[]> {
  const { data, error } = await supabase
    .from('watched_movies')
    .select(`rank_position, tier, movies(${MOVIE_FIELDS}), reviews(body)` as const)
    .eq('user_id', userId)
    .order('rank_position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    throw userError(error, failure);
  }
  const list = data.map((row) => ({
    movie: row.movies,
    rankPosition: row.rank_position,
    tier: row.rank_position === null ? null : readTier(row.tier),
    review: row.reviews?.body ?? null,
  }));
  // Rows come best first, so the ranked ones are already in list order.
  const scores = scoresForList(
    list.flatMap(({ movie, tier }) => (tier === null ? [] : [{ id: movie.id, tier }])),
  );
  return list.map((item) => ({ ...item, score: scores.get(item.movie.id) ?? null }));
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
  const { error } = await supabase
    .from('watched_movies')
    .delete()
    .eq('user_id', await currentUserId())
    .eq('movie_id', movieId);
  if (error) {
    throw userError(error, 'That movie couldn’t be removed. Try again.');
  }
}
