import { currentUserId } from '@/services/auth-service';
import { countComments } from '@/services/comment-service';
import { userError } from '@/services/errors';
import { getMovie, type Movie } from '@/services/movie-service';
import { buildTakes, type MoviePageTakes, rankedUserIds, userIdsOnPage } from '@/services/movie-page';
import { supabase } from '@/services/supabase';

/** Most reviews loaded for one movie, newest first. Plenty at class scale; paging can come later. */
const MAX_REVIEWS = 200;

const FAILED = 'This movie’s page couldn’t be loaded. Try again.';

export type MoviePage = MoviePageTakes & {
  movie: Movie;
  /** Comments you can see on each review, keyed by the review's author. */
  commentCounts: Map<string, number>;
};

/**
 * A movie's page (#40): your rank and review, your friends' ranks and reviews,
 * and other people's public reviews. RLS decides what comes back: reviews you
 * may read (yours, friends', public) and watched rows for you and your friends.
 */
export async function getMoviePage(movieId: number): Promise<MoviePage> {
  const [myId, movie, commentCounts, reviews, watched] = await Promise.all([
    currentUserId(),
    getMovie(movieId),
    countComments(movieId),
    supabase
      .from('reviews')
      .select('user_id, body, visibility, updated_at')
      .eq('movie_id', movieId)
      .order('updated_at', { ascending: false })
      .limit(MAX_REVIEWS),
    supabase.from('watched_movies').select('user_id, rank_position').eq('movie_id', movieId),
  ]);
  if (reviews.error || watched.error) {
    throw userError((reviews.error ?? watched.error)!, FAILED);
  }

  const [rankedCounts, usernames] = await Promise.all([
    countRanked(rankedUserIds(watched.data)),
    loadUsernames(userIdsOnPage(reviews.data, watched.data)),
  ]);
  return { movie, commentCounts, ...buildTakes({ myId, reviews: reviews.data, watched: watched.data, rankedCounts, usernames }) };
}

/** How many films each person has ranked, for "#4 of 62". One count per person, not their whole list. */
async function countRanked(userIds: string[]): Promise<Map<string, number>> {
  const counts = await Promise.all(
    userIds.map(async (userId) => {
      const { count, error } = await supabase
        .from('watched_movies')
        .select('movie_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('rank_position', 'is', null);
      if (error) {
        throw userError(error, FAILED);
      }
      return [userId, count ?? 0] as const;
    }),
  );
  return new Map(counts);
}

async function loadUsernames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase.from('profiles').select('id, username').in('id', userIds);
  if (error) {
    throw userError(error, FAILED);
  }
  return new Map(data.map((profile) => [profile.id, profile.username]));
}
