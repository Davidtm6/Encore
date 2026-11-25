/**
 * Comment logic (#41) with no Supabase or React Native imports, so Jest can
 * test it. Anyone who can read a review can comment on it; only a comment's
 * author can edit or delete it (see the review_comments migration).
 */

/** Matches the length check on review_comments.body. */
export const COMMENT_MAX_LENGTH = 2000;

export interface Comment {
  id: number;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Returns a message when the comment can't be posted as written, or null. */
export function validateComment(body: string): string | null {
  const text = body.trim();
  if (!text) {
    return 'Write something before posting.';
  }
  if (text.length > COMMENT_MAX_LENGTH) {
    return `Comments can be up to ${COMMENT_MAX_LENGTH.toLocaleString()} characters.`;
  }
  return null;
}

/** Only the author can edit or delete a comment; the database enforces the same rule. */
export function canChange(comment: Pick<Comment, 'authorId'>, myId: string | undefined): boolean {
  return comment.authorId === myId;
}

/** True when the comment was edited after it was posted (a minute's grace for slow saves). */
export function wasEdited({ createdAt, updatedAt }: Pick<Comment, 'createdAt' | 'updatedAt'>): boolean {
  return Date.parse(updatedAt) - Date.parse(createdAt) > 60_000;
}

/** How many comments each review of a movie has, keyed by the review's author. */
export function countByReview(rows: readonly { review_user_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { review_user_id: id } of rows) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** The label for a review's comments button: "Comment", "1 comment", "3 comments". */
export function commentsLabel(count: number): string {
  if (count === 0) {
    return 'Comment';
  }
  return count === 1 ? '1 comment' : `${count} comments`;
}
