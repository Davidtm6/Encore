/**
 * TMDB's audience score as shown in search results (#85). Plain module with no
 * React Native or Supabase imports, so Jest can test it.
 */

/** Fewer votes than this and the score says little (two votes of 10 isn't a 10), so it's hidden. */
export const MIN_VOTES = 10;

export interface RatingText {
  /** What the row shows, for example "★ 8.5". */
  label: string;
  /** What screen readers say, for example "TMDB rating 8.5 out of 10". */
  spoken: string;
}

/** The rating to show, or null when TMDB has none or too few votes for it to mean much. */
export function tmdbRatingText(
  voteAverage: number | null | undefined,
  voteCount: number | null | undefined,
): RatingText | null {
  if (voteAverage == null || voteCount == null || voteCount < MIN_VOTES) {
    return null;
  }
  const score = voteAverage.toFixed(1);
  return { label: `★ ${score}`, spoken: `TMDB rating ${score} out of 10` };
}
