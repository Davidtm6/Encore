import { userError } from '@/services/errors';
import { type Comment, countByReview } from '@/services/comments';
import { getMovie, type Movie } from '@/services/movie-service';
import { readVisibility, type ReviewVisibility } from '@/services/review-visibility';
import { supabase } from '@/services/supabase';

/** The review a thread hangs off. */
export interface ThreadReview {
  movie: Movie;
  authorId: string;
  authorName: string;
  body: string;
  visibility: ReviewVisibility;
}

const NOT_READABLE = 'This review was deleted or is no longer shared with you.';

/** The review and its author, or an error saying it can't be read (RLS hides it, or it's gone). */
export async function getThreadReview(reviewUserId: string, movieId: number): Promise<ThreadReview> {
  const [movie, review, author] = await Promise.all([
    getMovie(movieId),
    supabase
      .from('reviews')
      .select('body, visibility')
      .eq('user_id', reviewUserId)
      .eq('movie_id', movieId)
      .maybeSingle(),
    supabase.from('profiles').select('username').eq('id', reviewUserId).maybeSingle(),
  ]);
  if (review.error || author.error) {
    throw userError((review.error ?? author.error)!, 'This review couldn’t be loaded. Try again.');
  }
  if (!review.data) {
    throw new Error(NOT_READABLE);
  }
  return {
    movie,
    authorId: reviewUserId,
    authorName: author.data?.username ?? 'Someone',
    body: review.data.body,
    visibility: readVisibility(review.data.visibility),
  };
}

/** A review's comments, oldest first. */
export async function listComments(reviewUserId: string, movieId: number): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('review_comments')
    .select('id, author_id, body, created_at, updated_at, author:profiles!review_comments_author_id_fkey(username)')
    .eq('review_user_id', reviewUserId)
    .eq('movie_id', movieId)
    .order('created_at');
  if (error) {
    throw userError(error, 'The comments couldn’t be loaded. Try again.');
  }
  return data.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'Someone',
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Posts a comment as the signed-in user. */
export async function postComment(reviewUserId: string, movieId: number, body: string): Promise<void> {
  const { error } = await supabase
    .from('review_comments')
    .insert({ review_user_id: reviewUserId, movie_id: movieId, body: body.trim() });
  // RLS rejects a comment on a review you can no longer read; the FK, one on a deleted review.
  if (error?.code === '42501' || error?.code === '23503') {
    throw new Error(NOT_READABLE);
  }
  if (error) {
    throw userError(error, 'Your comment couldn’t be posted. Your text is still here; try again.');
  }
}

/** Replaces the text of one of your comments. */
export async function editComment(commentId: number, body: string): Promise<void> {
  const { error } = await supabase.from('review_comments').update({ body: body.trim() }).eq('id', commentId);
  if (error) {
    throw userError(error, 'Your comment couldn’t be saved. Your text is still here; try again.');
  }
}

/** Deletes one of your comments. RLS makes this do nothing for anyone else's. */
export async function deleteComment(commentId: number): Promise<void> {
  const { error } = await supabase.from('review_comments').delete().eq('id', commentId);
  if (error) {
    throw userError(error, 'That comment couldn’t be deleted. Try again.');
  }
}

/** How many comments each review of a movie has that you can see, keyed by the review's author. */
export async function countComments(movieId: number): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('review_comments').select('review_user_id').eq('movie_id', movieId);
  if (error) {
    throw userError(error, 'This movie’s page couldn’t be loaded. Try again.');
  }
  return countByReview(data);
}
