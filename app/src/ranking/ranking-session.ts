/**
 * Step-by-step binary insertion for the Rank screen, built from
 * insertionIndex in prototype/ranking.ts. Each answer returns a new session,
 * so canceling just drops the session and the saved list never changes.
 */

export interface RankingSession<T> {
  /** The ranked list, best first, without the movie being placed. */
  readonly others: readonly T[];
  readonly movie: T;
  /** The movie belongs at an index in [low, high] of `others`. */
  readonly low: number;
  readonly high: number;
}

/** Starts placing `movie`. If it is already ranked, this re-ranks it. */
export function startRanking<T>(ranked: readonly T[], movie: T): RankingSession<T> {
  const others = ranked.filter((item) => item !== movie);
  return { others, movie, low: 0, high: others.length };
}

export function isDone<T>(session: RankingSession<T>): boolean {
  return session.low >= session.high;
}

/** The movie to compare against next, or undefined once the position is known. */
export function nextOpponent<T>(session: RankingSession<T>): T | undefined {
  return isDone(session) ? undefined : session.others[middle(session)];
}

/** Records whether the user preferred the new movie over `nextOpponent`. */
export function choose<T>(session: RankingSession<T>, preferNew: boolean): RankingSession<T> {
  if (isDone(session)) {
    throw new Error('This ranking is already finished.');
  }
  const mid = middle(session);
  return preferNew ? { ...session, high: mid } : { ...session, low: mid + 1 };
}

/** The full best-first order with the movie in its new place. */
export function finalOrder<T>(session: RankingSession<T>): T[] {
  if (!isDone(session)) {
    throw new Error('This ranking still needs answers.');
  }
  const { others, movie, low } = session;
  return [...others.slice(0, low), movie, ...others.slice(low)];
}

function middle<T>(session: RankingSession<T>): number {
  return Math.floor((session.low + session.high) / 2);
}
