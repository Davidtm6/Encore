import {
  DEFAULT_VISIBILITY,
  readVisibility,
  VISIBILITY_OPTIONS,
  visibilityHint,
} from './review-visibility';

describe('review visibility', () => {
  it('defaults to friends only', () => {
    expect(DEFAULT_VISIBILITY).toBe('friends');
  });

  it('reads a stored value, treating anything unexpected as friends only', () => {
    expect(readVisibility('public')).toBe('public');
    expect(readVisibility('friends')).toBe('friends');
    for (const value of [null, undefined, '', 'PUBLIC', 'everyone', 1]) {
      expect(readVisibility(value)).toBe('friends');
    }
  });

  it('offers friends first, then everyone, each with a hint', () => {
    expect(VISIBILITY_OPTIONS.map((option) => option.value)).toEqual(['friends', 'public']);
    expect(visibilityHint('friends')).toMatch(/friends/);
    expect(visibilityHint('public')).toMatch(/Anyone/);
  });
});
