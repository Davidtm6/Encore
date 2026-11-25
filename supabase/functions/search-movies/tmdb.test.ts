import { escapeLike, MAX_OVERVIEW_LENGTH, POSTER_BASE_URL, shortOverview, tmdbRating, toMovieRows } from './tmdb.ts';

describe('toMovieRows', () => {
  it('maps a TMDB result to a movies row', () => {
    const rows = toMovieRows([
      {
        id: 496243,
        title: 'Parasite',
        release_date: '2019-05-30',
        poster_path: '/abc.jpg',
        vote_average: 8.497,
        vote_count: 19876,
      },
    ]);

    expect(rows).toEqual([
      {
        provider: 'tmdb',
        provider_movie_id: '496243',
        title: 'Parasite',
        release_year: 2019,
        poster_url: `${POSTER_BASE_URL}/abc.jpg`,
        vote_average: 8.5,
        vote_count: 19876,
      },
    ]);
  });

  it('leaves the year and poster empty when TMDB has none', () => {
    const rows = toMovieRows([
      { id: 1, title: 'No date', release_date: '', poster_path: null },
      { id: 2, title: 'Missing fields' },
      { id: 3, title: 'Bad date', release_date: 'TBA' },
    ]);

    expect(rows.map((row) => [row.release_year, row.poster_url])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('drops adult results, untitled results, and repeats while keeping order', () => {
    const rows = toMovieRows([
      { id: 3, title: 'Third' },
      { id: 9, title: 'Adult', adult: true },
      { id: 1, title: '   ' },
      { id: 2 },
      { id: 3, title: 'Third again' },
      { id: 4, title: '  Fourth  ' },
    ]);

    expect(rows.map((row) => [row.provider_movie_id, row.title])).toEqual([
      ['3', 'Third'],
      ['4', 'Fourth'],
    ]);
  });

  it('returns nothing for no results', () => {
    expect(toMovieRows([])).toEqual([]);
  });
});

describe('tmdbRating', () => {
  it('rounds the score to one decimal place and keeps the vote count', () => {
    expect(tmdbRating({ vote_average: 7.849, vote_count: 312 })).toEqual({ vote_average: 7.8, vote_count: 312 });
    expect(tmdbRating({ vote_average: 0, vote_count: 0 })).toEqual({ vote_average: 0, vote_count: 0 });
    expect(tmdbRating({ vote_average: 10, vote_count: 1 })).toEqual({ vote_average: 10, vote_count: 1 });
  });

  it('is null when TMDB has no score', () => {
    expect(tmdbRating({})).toEqual({ vote_average: null, vote_count: null });
  });

  it('drops values that are not sensible numbers', () => {
    const odd = [
      { vote_average: 11, vote_count: -3 },
      { vote_average: -0.5, vote_count: 2.5 },
      { vote_average: Number.NaN, vote_count: Number.POSITIVE_INFINITY },
      { vote_average: '8.5', vote_count: '100' },
    ] as unknown as { vote_average: number; vote_count: number }[];
    for (const movie of odd) {
      expect(tmdbRating(movie)).toEqual({ vote_average: null, vote_count: null });
    }
  });
});

describe('shortOverview', () => {
  it('keeps a short overview as it is, with whitespace tidied', () => {
    expect(shortOverview('  A family of con artists\n  moves in.  ')).toBe('A family of con artists moves in.');
  });

  it('is null when TMDB has no overview', () => {
    for (const overview of [undefined, '', '   ']) {
      expect(shortOverview(overview)).toBeNull();
    }
  });

  it('cuts a long overview at a word and marks the cut', () => {
    const long = 'word, '.repeat(100);
    const short = shortOverview(long);

    expect(short).not.toBeNull();
    expect(short!.length).toBeLessThanOrEqual(MAX_OVERVIEW_LENGTH + 1);
    expect(short).toMatch(/^word(, word)*…$/);
  });
});

describe('escapeLike', () => {
  it('escapes wildcards and backslashes so they match literally', () => {
    expect(escapeLike('100% _real_ \\o/')).toBe('100\\% \\_real\\_ \\\\o/');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLike('Spirited Away')).toBe('Spirited Away');
  });
});
