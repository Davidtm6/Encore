import { OFFLINE_MESSAGE } from '@/services/errors';
import { SEARCH_UNAVAILABLE, searchErrorMessage, SESSION_EXPIRED } from '@/services/search-error';

/** Shaped like supabase-js's FunctionsHttpError, whose context is the Response. */
function httpError(status: number, body: unknown) {
  return {
    name: 'FunctionsHttpError',
    context: new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  };
}

describe('searchErrorMessage', () => {
  it('says the phone is offline when the function could not be reached', async () => {
    expect(await searchErrorMessage({ name: 'FunctionsFetchError', context: new TypeError() })).toBe(OFFLINE_MESSAGE);
  });

  it('asks the user to sign in again when the session is rejected', async () => {
    expect(await searchErrorMessage(httpError(401, { code: 'INVALID_JWT' }))).toBe(SESSION_EXPIRED);
  });

  it("shows the function's own error message", async () => {
    expect(await searchErrorMessage(httpError(502, { error: 'Search isn’t available right now. Try again.' }))).toBe(
      'Search isn’t available right now. Try again.',
    );
  });

  it('falls back to a general message for a body without a usable error', async () => {
    for (const body of ['<html>Bad gateway</html>', { error: { code: 'X' } }, {}]) {
      expect(await searchErrorMessage(httpError(500, body))).toBe(SEARCH_UNAVAILABLE);
    }
  });

  it('falls back to a general message for relay and unknown errors', async () => {
    for (const error of [{ name: 'FunctionsRelayError' }, new Error('boom'), null, undefined, 'text']) {
      expect(await searchErrorMessage(error)).toBe(SEARCH_UNAVAILABLE);
    }
  });
});
