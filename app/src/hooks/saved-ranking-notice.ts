/**
 * Hands the result of a saved ranking from the Rank screen to My List, which
 * shows "Saved at #4", scrolls to the movie, and highlights it (#51). The Rank
 * screen closes with router.back(), which can't pass data, so the notice waits
 * here until My List next comes into focus.
 */

export interface SavedRankingNotice {
  movieId: number;
  title: string;
  position: number;
}

let pending: SavedRankingNotice | null = null;

export function setSavedRankingNotice(notice: SavedRankingNotice): void {
  pending = notice;
}

/** Returns the waiting notice, if any, and clears it so it shows only once. */
export function takeSavedRankingNotice(): SavedRankingNotice | null {
  const notice = pending;
  pending = null;
  return notice;
}
