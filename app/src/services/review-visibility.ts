/**
 * Who can read a review (#15), as stored in reviews.visibility. Plain module
 * with no React Native or Supabase imports, so Jest can test it.
 */

export type ReviewVisibility = 'friends' | 'public';

/** New reviews, and reviews written before visibility existed, are friends-only. */
export const DEFAULT_VISIBILITY: ReviewVisibility = 'friends';

/** The choices on the review screen, in the order shown. */
export const VISIBILITY_OPTIONS: readonly { value: ReviewVisibility; label: string; hint: string }[] = [
  { value: 'friends', label: 'Friends', hint: 'Only you and your friends can read it.' },
  { value: 'public', label: 'Everyone', hint: 'Anyone signed in to Encore can read it.' },
];

/** A stored visibility as the app's type; anything unexpected is treated as the safer 'friends'. */
export function readVisibility(value: unknown): ReviewVisibility {
  return value === 'public' ? 'public' : DEFAULT_VISIBILITY;
}

/** The one-line explanation shown under the picker. */
export function visibilityHint(visibility: ReviewVisibility): string {
  return VISIBILITY_OPTIONS.find((option) => option.value === visibility)!.hint;
}
