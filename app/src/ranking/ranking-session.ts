/**
 * Step-by-step binary insertion for the Rank screen, built from
 * insertionIndex in prototype/ranking.ts. Each answer returns a new session,
 * so canceling just drops the session and the saved list never changes.
 *
 * A ranking can be limited to one tier's part of the list (#60), and an
 * opponent that's too close to call can be skipped for another one (#43).
 */

import { tierOrder, type Tier } from './score';

export interface RankingSession<T> {
  /** The ranked list, best first, without the movie being placed. */
  readonly others: readonly T[];
  readonly movie: T;
  /** The movie belongs at an index in [low, high] of `others`. */
  readonly low: number;
  readonly high: number;
  /** Opponents skipped as too close to call. They aren't asked again in this ranking. */
  readonly skipped: ReadonlySet<T>;
}

/** The part of the list a ranking may place the movie in: an index range of `others`, both ends included. */
export interface Bounds {
  low: number;
  high: number;
}

/**
 * Starts placing `movie`. If it is already ranked, this re-ranks it. `bounds`
 * limits where it can land, such as one tier's part of the list; by default
 * it can land anywhere.
 */
export function startRanking<T>(ranked: readonly T[], movie: T, bounds?: Bounds): RankingSession<T> {
  const others = ranked.filter((item) => item !== movie);
  const low = bounds?.low ?? 0;
  const high = bounds?.high ?? others.length;
  if (low < 0 || high < low || high > others.length) {
    throw new Error('The ranking bounds are outside the list.');
  }
  return { others, movie, low, high, skipped: new Set() };
}

/**
 * Where a movie in `tier` can land: after every movie in a better tier and
 * before every movie in a worse one. `ranked` is the list best first, which
 * already has its tiers in order; `movie` is left out, as in startRanking. An
 * empty tier gives low === high, so the movie needs no comparisons.
 */
export function tierBounds<T>(ranked: readonly { id: T; tier: Tier }[], movie: T, tier: Tier): Bounds {
  const others = ranked.filter((item) => item.id !== movie);
  const rank = tierOrder(tier);
  const low = others.filter((item) => tierOrder(item.tier) < rank).length;
  const high = low + others.filter((item) => item.tier === tier).length;
  return { low, high };
}

export function isDone<T>(session: RankingSession<T>): boolean {
  return session.low >= session.high;
}

/** The movie to compare against next, or undefined once the position is known. */
export function nextOpponent<T>(session: RankingSession<T>): T | undefined {
  const index = opponentIndex(session);
  return index === undefined ? undefined : session.others[index];
}

/** Records whether the user preferred the new movie over `nextOpponent`. */
export function choose<T>(session: RankingSession<T>, preferNew: boolean): RankingSession<T> {
  const index = opponentIndex(session);
  if (index === undefined) {
    throw new Error('This ranking is already finished.');
  }
  return settle(preferNew ? { ...session, high: index } : { ...session, low: index + 1 });
}

/**
 * Skips `nextOpponent` as too close to call and moves on to another movie in
 * the range. When every movie left in the range has been skipped, the movie
 * lands in the middle of the range.
 */
export function skip<T>(session: RankingSession<T>): RankingSession<T> {
  const index = opponentIndex(session);
  if (index === undefined) {
    throw new Error('This ranking is already finished.');
  }
  return settle({ ...session, skipped: new Set([...session.skipped, session.others[index]]) });
}

/**
 * The most comparisons still needed: the movie has high - low + 1 possible
 * places left, and each answer halves them. The real count can be one lower.
 */
export function comparisonsLeft<T>(session: RankingSession<T>): number {
  return isDone(session) ? 0 : Math.ceil(Math.log2(session.high - session.low + 1));
}

/**
 * How far through the comparisons the person is, from 0 to 1, for the Rank
 * screen's progress bar (#62). `left` is an upper bound, and each answer uses
 * up at least one of it, so the fraction only grows. It reaches 1 when no
 * comparisons are left, which can be one question earlier than first shown.
 */
export function progressFraction(answered: number, left: number): number {
  const total = answered + left;
  return total === 0 ? 1 : answered / total;
}

/**
 * The best and worst places the movie can still take, counting from 1, and
 * the length of the list it is joining (#63). Each answer narrows the range,
 * and it always contains the place the movie ends up in.
 */
export function placeRange<T>(session: RankingSession<T>): { best: number; worst: number; total: number } {
  return { best: session.low + 1, worst: session.high + 1, total: session.others.length + 1 };
}

/** The movies just above and below the movie's new place, once it is known. */
export function neighbors<T>(session: RankingSession<T>): { above?: T; below?: T } {
  if (!isDone(session)) {
    throw new Error('This ranking still needs answers.');
  }
  const { others, low } = session;
  return { above: low > 0 ? others[low - 1] : undefined, below: others[low] };
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

/**
 * The index in `others` of the next opponent: the middle of the range, or the
 * nearest movie to it that hasn't been skipped (middle + 1, - 1, + 2, ...).
 * Opponents come from [low, high - 1]; undefined when there are none left.
 */
function opponentIndex<T>(session: RankingSession<T>): number | undefined {
  const { low, high, others, skipped } = session;
  if (low >= high) {
    return undefined;
  }
  const mid = middle(session);
  for (let step = 0; step <= high - low; step++) {
    for (const index of step === 0 ? [mid] : [mid + step, mid - step]) {
      if (index >= low && index < high && !skipped.has(others[index])) {
        return index;
      }
    }
  }
  return undefined;
}

/** Ends the ranking in the middle of the range once every movie left in it has been skipped. */
function settle<T>(session: RankingSession<T>): RankingSession<T> {
  if (isDone(session) || opponentIndex(session) !== undefined) {
    return session;
  }
  const mid = middle(session);
  return { ...session, low: mid, high: mid };
}
