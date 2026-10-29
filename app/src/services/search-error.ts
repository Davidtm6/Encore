import { OFFLINE_MESSAGE } from '@/services/errors';

export const SEARCH_UNAVAILABLE = 'Search isn’t available right now. Try again.';
export const SESSION_EXPIRED = 'Your session expired. Sign out and sign back in.';

/**
 * The message for a failed call to the search-movies function. It matches
 * supabase-js's function errors by name, not with instanceof, so it can be
 * tested without the Supabase client.
 */
export async function searchErrorMessage(error: unknown): Promise<string> {
  const { name, context } = (error ?? {}) as { name?: unknown; context?: unknown };
  if (name === 'FunctionsFetchError') {
    return OFFLINE_MESSAGE;
  }
  // For an HTTP error, context is the function's Response.
  const response = context as { status?: unknown; json?: () => Promise<unknown> } | undefined;
  if (name === 'FunctionsHttpError' && typeof response?.json === 'function') {
    if (response.status === 401) {
      return SESSION_EXPIRED;
    }
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    if (typeof body?.error === 'string') {
      return body.error;
    }
  }
  return SEARCH_UNAVAILABLE;
}
