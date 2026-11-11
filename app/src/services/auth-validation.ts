/**
 * Sign-in and sign-up form rules, kept free of React Native and Supabase so
 * the root Jest config can test them.
 */

const USERNAME = /^[A-Za-z0-9_]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

/** Shown under the fields before the first submit, so the rules are known up front. */
export const USERNAME_HINT = '3–30 letters, numbers, or underscores.';
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters.`;

export type CredentialField = 'username' | 'email' | 'password';
export type CredentialErrors = Partial<Record<CredentialField, string>>;

/**
 * Checks every field at once and returns a message for each invalid one, so
 * the form can show them all next to their fields. Pass `username` only when
 * signing up. An empty object means the form can be sent.
 */
export function validateCredentials(email: string, password: string, username?: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (username !== undefined && !USERNAME.test(username)) {
    errors.username = 'Usernames are 3–30 letters, numbers, or underscores.';
  }
  if (!EMAIL.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Object.keys(errors).length > 0;
}
