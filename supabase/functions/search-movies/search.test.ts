import {
  MAX_QUERY_LENGTH,
  type Movie,
  readQuery,
  SEARCH_UNAVAILABLE,
  type SearchDeps,
  searchMovies,
  TMDB_API,
  tmdbResults,
  tmdbUrl,
} from './search.ts';
import { POSTER_BASE_URL } from './tmdb.ts';

/** Fake TMDB and database: saved rows get ids from 100, in the order saved. */
function fakeDeps(tmdbResponse: unknown, overrides: Partial<SearchDeps> = {}) {
  const calls = { urls: [] as string[], saved: [] as string[][], fallbackQueries: [] as string[] };
  const logged: string[] = [];
  const deps: SearchDeps = {
    fetchTmdb: async (url) => {
      calls.urls.push(url);
      return tmdbResponse;
    },
    saveRows: async (rows) => {
      calls.saved.push(rows.map((row) => row.provider_movie_id));
      // Return in reverse to prove the result keeps TMDB's order, not the database's.
      return rows
        .map((row, i) => ({
          id: 100 + i,
          title: row.title,
          release_year: row.release_year,
          poster_url: row.poster_url,
          provider_movie_id: row.provider_movie_id,
        }))
        .reverse();
    },
    searchSaved: async (query) => {
      calls.fallbackQueries.push(query);
      return [{ id: 7, title: 'Saved film', release_year: 2000, poster_url: null }];
    },
    logError: (message) => logged.push(message),
    ...overrides,
  };
  return { deps, calls, logged };
}

const tmdb = (...movies: object[]) => ({ page: 1, results: movies });

describe('readQuery', () => {
  it('trims the query', () => {
    expect(readQuery({ query: '  parasite  ' })).toBe('parasite');
  });

  it(`caps the query at ${MAX_QUERY_LENGTH} characters`, () => {
    expect(readQuery({ query: 'x'.repeat(500) })).toHaveLength(MAX_QUERY_LENGTH);
  });

  it('treats a missing, non-string, or unreadable body as an empty query', () => {
    for (const body of [null, undefined, {}, { query: 42 }, { query: ['a'] }, 'parasite']) {
      expect(readQuery(body)).toBe('');
    }
  });
});

describe('tmdbUrl', () => {
  it('searches without adult results for a query', () => {
    const url = new URL(tmdbUrl('spirited away'));

    expect(`${url.origin}${url.pathname}`).toBe(`${TMDB_API}/search/movie`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: 'spirited away',
      include_adult: 'false',
      language: 'en-US',
      page: '1',
    });
  });

  it('encodes characters that have meaning in a URL', () => {
    expect(new URL(tmdbUrl('100% & more?')).searchParams.get('query')).toBe('100% & more?');
  });

  it('asks for popular movies when the query is empty', () => {
    expect(tmdbUrl('')).toBe(`${TMDB_API}/movie/popular?language=en-US&page=1`);
  });
});

describe('tmdbResults', () => {
  it('returns the results array', () => {
    expect(tmdbResults(tmdb({ id: 1 }))).toEqual([{ id: 1 }]);
  });

  it('returns nothing for a response without a results array', () => {
    for (const response of [null, {}, { results: 'nope' }, { status_message: 'Invalid API key' }]) {
      expect(tmdbResults(response)).toEqual([]);
    }
  });
});

describe('searchMovies', () => {
  it('saves TMDB results and returns them with ids in TMDB order', async () => {
    const { deps, calls } = fakeDeps(
      tmdb(
        {
          id: 496243,
          title: 'Parasite',
          release_date: '2019-05-30',
          poster_path: '/p.jpg',
          overview: 'All unemployed, the Kim family takes a peculiar interest in the wealthy Parks.',
        },
        { id: 48311, title: 'Parasite', release_date: '1982-03-12', poster_path: null },
      ),
    );

    const result = await searchMovies('parasite', deps);

    expect(calls.urls).toEqual([tmdbUrl('parasite')]);
    expect(calls.saved).toEqual([['496243', '48311']]);
    // The overview tells same-titled films apart (#47); it's passed through, not saved.
    expect(result).toEqual({
      status: 200,
      body: {
        movies: [
          {
            id: 100,
            title: 'Parasite',
            release_year: 2019,
            poster_url: `${POSTER_BASE_URL}/p.jpg`,
            overview: 'All unemployed, the Kim family takes a peculiar interest in the wealthy Parks.',
          },
          { id: 101, title: 'Parasite', release_year: 1982, poster_url: null, overview: null },
        ],
      },
    });
  });

  it('returns no movies, and saves nothing, when TMDB finds nothing', async () => {
    const { deps, calls } = fakeDeps(tmdb());

    expect(await searchMovies('zzzz', deps)).toEqual({ status: 200, body: { movies: [] } });
    expect(calls.saved).toEqual([]);
    expect(calls.fallbackQueries).toEqual([]);
  });

  it('suggests the nearest titles when a misspelled query finds nothing', async () => {
    const calls: string[] = [];
    const { deps, calls: saved } = fakeDeps(null, {
      // TMDB matches the start of a word, so only the shortened queries find anything.
      fetchTmdb: async (url) => {
        calls.push(url);
        if (url === tmdbUrl('interstell')) {
          return tmdb(
            { id: 3, title: 'Interstellar Wars', release_date: '2016-01-01' },
            { id: 157336, title: 'Interstellar', release_date: '2014-11-05', overview: 'A team of explorers.' },
            { id: 9, title: 'Something Else Entirely' },
          );
        }
        return tmdb();
      },
    });

    const result = await searchMovies('intersteller', deps);

    expect(calls).toEqual([
      tmdbUrl('intersteller'),
      tmdbUrl('interstelle'),
      tmdbUrl('interstell'),
      tmdbUrl('interstel'),
    ]);
    // Only the near matches are saved, nearest first; the unrelated film is dropped.
    expect(saved.saved).toEqual([['157336', '3']]);
    expect(result).toEqual({
      status: 200,
      body: {
        movies: [],
        suggestions: [
          { id: 100, title: 'Interstellar', release_year: 2014, poster_url: null, overview: 'A team of explorers.' },
          { id: 101, title: 'Interstellar Wars', release_year: 2016, poster_url: null, overview: null },
        ],
      },
    });
  });

  it('still answers with no movies when looking for near matches fails', async () => {
    let first = true;
    const { deps, calls, logged } = fakeDeps(null, {
      fetchTmdb: async () => {
        if (first) {
          first = false;
          return tmdb();
        }
        return tmdb({ id: 1, title: 'Incepton' });
      },
      saveRows: async () => {
        throw new Error('permission denied');
      },
    });

    expect(await searchMovies('incepton', deps)).toEqual({ status: 200, body: { movies: [] } });
    expect(calls.fallbackQueries).toEqual([]);
    expect(logged).toEqual(['Looking for near matches failed.']);
  });

  it('does not look for near matches when the popular list is empty', async () => {
    const { deps, calls } = fakeDeps(tmdb());

    expect(await searchMovies('', deps)).toEqual({ status: 200, body: { movies: [] } });
    expect(calls.urls).toEqual([tmdbUrl('')]);
  });

  it('never saves or returns adult results', async () => {
    const { deps, calls } = fakeDeps(tmdb({ id: 1, title: 'Adult', adult: true }, { id: 2, title: 'Fine' }));

    const result = await searchMovies('x', deps);

    expect(calls.saved).toEqual([['2']]);
    expect(result.status === 200 && result.body.movies.map((m: Movie) => m.title)).toEqual(['Fine']);
  });

  it('falls back to saved movies when TMDB fails', async () => {
    const { deps, calls, logged } = fakeDeps(null, {
      fetchTmdb: async () => {
        throw new Error('TMDB responded with 503.');
      },
    });

    const result = await searchMovies('saved', deps);

    expect(calls.fallbackQueries).toEqual(['saved']);
    expect(result).toEqual({
      status: 200,
      // fromSaved lets the app say why there are no plot lines (#54).
      body: { movies: [{ id: 7, title: 'Saved film', release_year: 2000, poster_url: null }], fromSaved: true },
    });
    expect(logged).toEqual(['TMDB search failed; searching saved movies instead.']);
  });

  it('falls back to saved movies when saving TMDB results fails', async () => {
    const { deps, calls } = fakeDeps(tmdb({ id: 1, title: 'A' }), {
      saveRows: async () => {
        throw new Error('permission denied');
      },
    });

    const result = await searchMovies('a', deps);

    expect(calls.fallbackQueries).toEqual(['a']);
    expect(result.status).toBe(200);
  });

  it('reports search as unavailable when the fallback fails too', async () => {
    const { deps, logged } = fakeDeps(null, {
      fetchTmdb: async () => {
        throw new Error('offline');
      },
      searchSaved: async () => {
        throw new Error('database down');
      },
    });

    expect(await searchMovies('a', deps)).toEqual({ status: 502, body: { error: SEARCH_UNAVAILABLE } });
    expect(logged).toHaveLength(2);
  });

  it('leaves out a row the database did not return', async () => {
    const { deps } = fakeDeps(tmdb({ id: 1, title: 'Kept' }, { id: 2, title: 'Missing' }), {
      saveRows: async () => [{ id: 9, title: 'Kept', release_year: null, poster_url: null, provider_movie_id: '1' }],
    });

    const result = await searchMovies('k', deps);

    expect(result.status === 200 && result.body.movies.map((m: Movie) => m.id)).toEqual([9]);
  });
});
