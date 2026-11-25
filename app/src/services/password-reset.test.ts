import { OFFLINE_MESSAGE } from './errors';
import { normalizeResetCode, recoveringAfter, resetError, validateResetCode } from './password-reset';

describe('validateResetCode', () => {
  it('accepts a 6-digit code, with or without spaces', () => {
    expect(validateResetCode('123456')).toBeUndefined();
    expect(validateResetCode(' 123 456 ')).toBeUndefined();
    expect(normalizeResetCode(' 123 456 ')).toBe('123456');
  });

  it('accepts the longer codes a project can be set to send', () => {
    expect(validateResetCode('12345678')).toBeUndefined();
  });

  it('rejects empty, short, and non-digit codes', () => {
    for (const code of ['', '12345', 'abcdef', '12345a', '1'.repeat(11)]) {
      expect(validateResetCode(code)).toBe('Enter the code from the email, digits only.');
    }
  });
});

describe('resetError', () => {
  it('explains a wrong, expired, or used code and how to get a new one', () => {
    const message = resetError({ code: 'otp_expired', message: 'Token has expired or is invalid' }).message;

    expect(message).toMatch(/wrong or has expired/);
    expect(message).toMatch(/send a new code/);
  });

  it('asks people to wait when emails or tries are rate-limited', () => {
    expect(resetError({ code: 'over_email_send_rate_limit', message: '' }).message).toMatch(/Wait a few minutes/);
    expect(resetError({ code: 'over_request_rate_limit', message: '' }).message).toMatch(/Wait a few minutes/);
  });

  it('rejects reusing the old password', () => {
    expect(resetError({ code: 'same_password', message: '' }).message).toBe(
      'Choose a password different from your old one.',
    );
  });

  it('passes on Supabase’s own explanation of a weak password', () => {
    const message = 'Password should be at least 6 characters.';

    expect(resetError({ code: 'weak_password', message }).message).toBe(message);
  });

  it('says when the app is offline', () => {
    expect(resetError({ message: 'Network request failed' }).message).toBe(OFFLINE_MESSAGE);
  });

  it('falls back to a generic message without showing raw errors', () => {
    expect(resetError({ code: 'unexpected_failure', message: 'stack trace' }).message).toBe(
      'Something went wrong. Try again.',
    );
  });
});

describe('recoveringAfter', () => {
  it('starts when a reset code signs the person in', () => {
    expect(recoveringAfter('PASSWORD_RECOVERY', false)).toBe(true);
  });

  it('ends when the new password is saved or the person signs out', () => {
    for (const event of ['USER_UPDATED', 'SIGNED_OUT', 'SIGNED_IN']) {
      expect(recoveringAfter(event, true)).toBe(false);
    }
  });

  it('survives token refreshes in the middle of a reset', () => {
    expect(recoveringAfter('TOKEN_REFRESHED', true)).toBe(true);
    expect(recoveringAfter('TOKEN_REFRESHED', false)).toBe(false);
  });

  it('is off on launch, even with a session left from an unfinished reset', () => {
    expect(recoveringAfter('INITIAL_SESSION', false)).toBe(false);
  });
});
