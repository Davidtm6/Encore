/**
 * What removing a movie from your list costs, for the confirmation dialog.
 * Plain module, so Jest can test it.
 */
export function removalWarning(rankPosition: number | null, hasReview: boolean): string {
  const lost = [rankPosition && `its #${rankPosition} spot`, hasReview && 'your review'].filter(Boolean).join(' and ');
  return lost ? `This also deletes ${lost}.` : 'You can add it again from Search.';
}
