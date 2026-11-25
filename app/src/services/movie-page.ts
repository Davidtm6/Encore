/**
 * The movie page's logic (#40) with no Supabase or React Native imports, so
 * Jest can test it. movie-page-service.ts loads the rows; this sorts them into
 * your take, your friends' takes, and everyone else's public reviews.
 */

import { readVisibility, type ReviewVisibility } from '@/services/review-visibility';

/** A review row as loaded for one movie. RLS returns yours, your friends', and public ones. */
export interface ReviewRow {
  user_id: string;
  body: string;
  visibility: string;
  updated_at: string;
}

/**
 * A watched_movies row for this movie. RLS returns only yours and your
 * friends', so a row from someone else means they're your friend.
 */
export interface WatchedRow {
  user_id: string;
  rank_position: number | null;
}

/** Where someone ranked this movie in their list. */
export interface Placement {
  position: number;
  /** How many films they've ranked. */
  outOf: number;
}

export interface Take {
  userId: string;
  username: string;
  /** Null for someone who watched it but hasn't ranked it, and always null for non-friends. */
  placement: Placement | null;
  review: { body: string; visibility: ReviewVisibility; updatedAt: string } | null;
}

export interface MoviePageTakes {
  /** Null when the movie isn't on your list. */
  mine: Take | null;
  /** Friends who watched it, ranked best-placed first, then the unranked, by username. */
  friends: Take[];
  /** Public reviews by people who aren't your friends, newest first. */
  others: Take[];
}

export interface MoviePageRows {
  myId: string;
  reviews: readonly ReviewRow[];
  watched: readonly WatchedRow[];
  /** Number of ranked films per user id, for people who ranked this movie. */
  rankedCounts: ReadonlyMap<string, number>;
  usernames: ReadonlyMap<string, string>;
}

/** "#4 of 62", or "#1" for someone who has ranked only this film. */
export function placementLabel({ position, outOf }: Placement): string {
  return outOf > 1 ? `#${position} of ${outOf}` : `#${position}`;
}

/** The read-aloud version of placementLabel: "ranked 4th of 62". */
export function spokenPlacement({ position, outOf }: Placement): string {
  return outOf > 1 ? `ranked ${ordinal(position)} of ${outOf}` : `ranked ${ordinal(position)}`;
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** The user ids whose ranked-film count the page needs: everyone with a rank for this movie. */
export function rankedUserIds(watched: readonly WatchedRow[]): string[] {
  return [...new Set(watched.filter((row) => row.rank_position !== null).map((row) => row.user_id))];
}

/** Every user id the page shows, for looking up usernames. */
export function userIdsOnPage(reviews: readonly ReviewRow[], watched: readonly WatchedRow[]): string[] {
  return [...new Set([...reviews.map((row) => row.user_id), ...watched.map((row) => row.user_id)])];
}

/** Sorts one movie's rows into the page's three groups. */
export function buildTakes({ myId, reviews, watched, rankedCounts, usernames }: MoviePageRows): MoviePageTakes {
  const reviewsBy = new Map(reviews.map((row) => [row.user_id, row]));
  const take = (userId: string, rankPosition: number | null): Take => {
    const review = reviewsBy.get(userId);
    return {
      userId,
      username: usernames.get(userId) ?? 'Someone',
      placement:
        rankPosition === null ? null : { position: rankPosition, outOf: rankedCounts.get(userId) ?? rankPosition },
      review: review
        ? { body: review.body, visibility: readVisibility(review.visibility), updatedAt: review.updated_at }
        : null,
    };
  };

  const myRow = watched.find((row) => row.user_id === myId);
  const friendRows = watched.filter((row) => row.user_id !== myId);
  const friendIds = new Set(friendRows.map((row) => row.user_id));

  const friends = friendRows
    .map((row) => take(row.user_id, row.rank_position))
    .sort(
      (a, b) =>
        (a.placement?.position ?? Infinity) - (b.placement?.position ?? Infinity) ||
        a.username.localeCompare(b.username, undefined, { sensitivity: 'base' }),
    );

  const others = reviews
    .filter((row) => row.user_id !== myId && !friendIds.has(row.user_id))
    .map((row) => take(row.user_id, null))
    .sort((a, b) => b.review!.updatedAt.localeCompare(a.review!.updatedAt));

  return { mine: myRow ? take(myId, myRow.rank_position) : null, friends, others };
}
