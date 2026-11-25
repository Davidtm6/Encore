/**
 * Filing a movie under a tier without comparisons (#79). Someone logging a lot
 * of movies can say "loved it" now and compare later: the movie goes to the
 * bottom of that tier, a rough place that a re-rank refines.
 */

import { tierBounds } from './ranking-session';
import type { Tier } from './score';

/**
 * The whole ranking, best first, with `movie` at the bottom of `tier`, and
 * each movie's tier in the same order, ready for save_ranking. `ranked` is the
 * current list best first; if `movie` is already in it, it moves.
 */
export function placeAtTierEnd<T>(
  ranked: readonly { id: T; tier: Tier }[],
  movie: T,
  tier: Tier,
): { order: T[]; tiers: Tier[]; position: number } {
  const others = ranked.filter((item) => item.id !== movie);
  const { high } = tierBounds(others, movie, tier);
  const list = [...others.slice(0, high), { id: movie, tier }, ...others.slice(high)];
  return { order: list.map((item) => item.id), tiers: list.map((item) => item.tier), position: high + 1 };
}
