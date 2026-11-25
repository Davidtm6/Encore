import { MIN_VOTES, tmdbRatingText } from '@/services/tmdb-rating';

describe('tmdbRatingText', () => {
  it('shows the score with one decimal place and reads it out of 10', () => {
    expect(tmdbRatingText(8.5, 19876)).toEqual({ label: '★ 8.5', spoken: 'TMDB rating 8.5 out of 10' });
    expect(tmdbRatingText(7, 50)).toEqual({ label: '★ 7.0', spoken: 'TMDB rating 7.0 out of 10' });
  });

  it(`hides a score based on fewer than ${MIN_VOTES} votes`, () => {
    expect(tmdbRatingText(10, MIN_VOTES - 1)).toBeNull();
    expect(tmdbRatingText(0, 0)).toBeNull();
    expect(tmdbRatingText(6.2, MIN_VOTES)).toEqual({ label: '★ 6.2', spoken: 'TMDB rating 6.2 out of 10' });
  });

  it('shows nothing when TMDB has no score', () => {
    expect(tmdbRatingText(null, 500)).toBeNull();
    expect(tmdbRatingText(8, null)).toBeNull();
    expect(tmdbRatingText(undefined, undefined)).toBeNull();
  });
});
