/**
 * Tiers and 0.0–10.0 scores (#60). A ranked list is every "loved" movie, then
 * every "okay" one, then every "disliked" one, each group best first. A movie's
 * score comes from its tier's band and its place within the tier, so it is
 * derived from the saved order and never stored.
 */

export type Tier = 'loved' | 'okay' | 'disliked';

/** Best tier first, the order they appear in a ranked list. */
export const TIERS: readonly Tier[] = ['loved', 'okay', 'disliked'];

export const TIER_LABELS: Record<Tier, string> = {
  loved: 'Loved it',
  okay: 'It was okay',
  disliked: 'Didn’t like it',
};

/** Each tier's score range. The bands don't overlap, so every loved movie outscores every okay one. */
export const TIER_BANDS: Record<Tier, { low: number; high: number }> = {
  loved: { low: 6.7, high: 10 },
  okay: { low: 3.4, high: 6.6 },
  disliked: { low: 0, high: 3.3 },
};

/** Reads a tier from the database, which only allows these three values. */
export function readTier(value: string | null): Tier | null {
  return value === 'loved' || value === 'okay' || value === 'disliked' ? value : null;
}

/** Where a tier sits in a ranked list: 0 for loved, 1 for okay, 2 for disliked. */
export function tierOrder(tier: Tier): number {
  return TIERS.indexOf(tier);
}

/**
 * The score of the movie at `indexInTier` (0 is the tier's best) in a tier of
 * `tierSize` movies. The tier's best gets the top of the band and its worst the
 * bottom, with the rest spread evenly between; a tier of one gets the top.
 */
export function scoreFor(tier: Tier, indexInTier: number, tierSize: number): number {
  const { low, high } = TIER_BANDS[tier];
  const raw = tierSize <= 1 ? high : high - ((high - low) * indexInTier) / (tierSize - 1);
  return Math.round(raw * 10) / 10;
}

/** Scores for a whole ranked list, given best first. Returns a map from id to score. */
export function scoresForList<T>(ranked: readonly { id: T; tier: Tier }[]): Map<T, number> {
  const sizes = new Map<Tier, number>();
  for (const { tier } of ranked) {
    sizes.set(tier, (sizes.get(tier) ?? 0) + 1);
  }
  const seen = new Map<Tier, number>();
  const scores = new Map<T, number>();
  for (const { id, tier } of ranked) {
    const index = seen.get(tier) ?? 0;
    seen.set(tier, index + 1);
    scores.set(id, scoreFor(tier, index, sizes.get(tier) ?? 1));
  }
  return scores;
}

/** A score as shown in the app, always with one decimal: "8.0", not "8". */
export function formatScore(score: number): string {
  return score.toFixed(1);
}
