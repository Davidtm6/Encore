import { hasErrors, validateCredentials } from './auth-validation';

describe('validateCredentials', () => {
  it('accepts a valid sign-up', () => {
    const errors = validateCredentials('p1@example.com', 'secret1', 'movie_fan');

    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it('reports every invalid field at once, not one per attempt (#46)', () => {
    const errors = validateCredentials('', '', '');

    expect(Object.keys(errors).sort()).toEqual(['email', 'password', 'username']);
    expect(errors.username).toBe('Usernames are 3–30 letters, numbers, or underscores.');
    expect(errors.email).toBe('Enter a valid email address.');
    expect(errors.password).toBe('Passwords need at least 6 characters.');
  });

  it('skips the username when signing in', () => {
    expect(validateCredentials('p1@example.com', 'secret1')).toEqual({});
  });

  it('rejects usernames that are too short, too long, or have other characters', () => {
    for (const username of ['ab', 'x'.repeat(31), 'has space', 'dash-name']) {
      expect(validateCredentials('p1@example.com', 'secret1', username).username).toBeDefined();
    }
  });

  it('flags only the fields that are wrong', () => {
    expect(validateCredentials('not-an-email', 'secret1', 'movie_fan')).toEqual({
      email: 'Enter a valid email address.',
    });
  });
});
