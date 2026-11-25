import { userError } from '@/services/errors';
import { readVisibility, type ReviewVisibility } from '@/services/review-visibility';
import { supabase } from '@/services/supabase';

/** The signed-in user's review of a movie. */
export interface MyReview {
  body: string;
  visibility: ReviewVisibility;
}

/** Matches the length check on reviews.body. */
export const REVIEW_MAX_LENGTH = 10000;

/** Returns a message when the review can't be saved as written, or null. */
export function validateReview(body: string): string | null {
  const text = body.trim();
  if (!text) {
    return 'Write something before saving.';
  }
  if (text.length > REVIEW_MAX_LENGTH) {
    return `Reviews can be up to ${REVIEW_MAX_LENGTH.toLocaleString()} characters.`;
  }
  return null;
}

/** The user's own review of a movie, or null. Friends' and public reviews are readable too, so filter by user. */
export async function getMyReview(userId: string, movieId: number): Promise<MyReview | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('body, visibility')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();
  if (error) {
    throw userError(error, 'Your review couldn’t be loaded. Try again.');
  }
  return data && { body: data.body, visibility: readVisibility(data.visibility) };
}

/** Creates or replaces the user's one review of a movie, with who can read it. */
export async function saveReview(
  userId: string,
  movieId: number,
  body: string,
  visibility: ReviewVisibility,
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .upsert({ user_id: userId, movie_id: movieId, body: body.trim(), visibility }, { onConflict: 'user_id,movie_id' });
  if (error?.code === '23503') {
    throw new Error('Mark this movie watched before reviewing it.');
  }
  if (error) {
    throw userError(error, 'Your review couldn’t be saved. Your text is still here; try again.');
  }
}
