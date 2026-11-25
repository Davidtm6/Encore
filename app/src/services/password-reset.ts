/**
 * Password-reset rules and messages, kept free of React Native and Supabase so
 * the root Jest config can test them.
 *
 * Encore resets passwords with a code from the email instead of a link. Expo Go
 * can't open `encore://` links, and a typed code works the same in Expo Go,
 * store builds, and the web build. The reset email template has to include
 * `{{ .Token }}` (see docs/setup.md).
 */

import { userError } from '@/services/errors';

const CODE = /^\d{6,10}$/;

/** Removes the spaces people add when copying a code from an email. */
export function normalizeResetCode(code: string): string {
  return code.replace(/\s+/g, '');
}

/** Returns a message when `code` can't be a reset code, or undefined when it can be sent. */
export function validateResetCode(code: string): string | undefined {
  return CODE.test(normalizeResetCode(code)) ? undefined : 'Enter the code from the email, digits only.';
}

/** Turns a Supabase Auth error from any reset step into a message for the person resetting. */
export function resetError(error: { code?: string; message: string }): Error {
  switch (error.code) {
    case 'otp_expired':
      return new Error('That code is wrong or has expired. Check the newest email, or send a new code.');
    case 'over_email_send_rate_limit':
      return new Error('Too many emails have been sent. Wait a few minutes, then send a new code.');
    case 'over_request_rate_limit':
      return new Error('Too many tries. Wait a few minutes, then try again.');
    case 'email_address_invalid':
      return new Error('Enter a valid email address.');
    case 'email_address_not_authorized':
      return new Error('Encore can’t send email to that address yet. Ask the Encore team to reset it for you.');
    case 'same_password':
      return new Error('Choose a password different from your old one.');
    case 'weak_password':
      return new Error(error.message);
    case 'session_not_found':
    case 'session_expired':
      return new Error('Your reset timed out. Send a new code and try again.');
  }
  return userError(error, 'Something went wrong. Try again.');
}

/**
 * Whether the session belongs to a password reset that isn't finished, after
 * Supabase Auth fires `event`. A correct reset code signs the person in with
 * PASSWORD_RECOVERY; they stay on the reset screen until the new password is
 * saved (USER_UPDATED) or they leave and are signed out.
 */
export function recoveringAfter(event: string, wasRecovering: boolean): boolean {
  switch (event) {
    case 'PASSWORD_RECOVERY':
      return true;
    case 'USER_UPDATED':
    case 'SIGNED_IN':
    case 'SIGNED_OUT':
      return false;
    default:
      // INITIAL_SESSION and TOKEN_REFRESHED don't change where the person is.
      return wasRecovering;
  }
}
