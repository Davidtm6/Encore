import { removalWarning } from '@/services/removal';

describe('removalWarning', () => {
  it('names what is lost with the movie', () => {
    expect(removalWarning(3, true)).toBe('This also deletes its #3 spot and your review.');
    expect(removalWarning(1, false)).toBe('This also deletes its #1 spot.');
    expect(removalWarning(null, true)).toBe('This also deletes your review.');
  });

  it('reassures when nothing else is lost', () => {
    expect(removalWarning(null, false)).toBe('You can add it again from Search.');
  });
});
