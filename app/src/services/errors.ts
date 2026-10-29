const OFFLINE = /network request failed|failed to fetch/i;

/** Builds a message for the person using the app from a Supabase error. */
export function userError(error: { message: string }, fallback: string): Error {
  return new Error(
    OFFLINE.test(error.message) ? "Can't reach Encore. Check your connection and try again." : fallback,
  );
}

/** The message to show for anything a service throws. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
