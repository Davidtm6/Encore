/**
 * TypeScript reference for Encore's binary insertion.
 * The app's ranking engine will build on this; it is not application code yet.
 */

/** Returns true when the new movie is preferred to its opponent. */
export type PreferNew = (newMovie: string, opponent: string) => boolean;

/**
 * Returns the position of a new movie in a best-first list without modifying
 * the input. Answers must be consistent with the current list's order.
 */
export function insertionIndex(
  ranked: readonly string[],
  newMovie: string,
  preferNew: PreferNew,
): number {
  if (ranked.includes(newMovie)) {
    throw new Error('This movie is already ranked.');
  }
  let low = 0;
  let high = ranked.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (preferNew(newMovie, ranked[middle])) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}
