import { escapeLike, MAX_OVERVIEW_LENGTH, POSTER_BASE_URL, shortOverview, toMovieRows } from './tmdb.ts';

describe('toMovieRows', () => {
  it('maps a TMDB result to a movies row', () => {
    const rows = toMovieRows([
      { id: 496243, title: 'Parasite', release_date: '2019-05-30', poster_path: '/abc.jpg' },
    ]);

    expect(rows).toEqual([
      {
        provider: 'tmdb',
        provider_movie_id: '496243',
        title: 'Parasite',
        release_year: 2019,
        poster_url: `${POSTER_BASE_URL}/abc.jpg`,
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
