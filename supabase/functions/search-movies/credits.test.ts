import {
  creditsUrl,
  type DirectorDeps,
  type DirectorTarget,
  directorName,
  fillDirectors,
  MAX_DIRECTOR_LOOKUPS,
  readDirectorIds,
} from './credits.ts';
import { TMDB_API } from './search.ts';

const credits = (...crew: object[]) => ({ id: 1, cast: [], crew });

describe('directorName', () => {
  it('is null when the crew has no director', () => {
    expect(directorName(credits({ name: 'Someone', job: 'Producer' }))).toBeNull();
    expect(directorName(credits())).toBeNull();
  });

  it('is null for a response without a crew list', () => {
    for (const response of [null, undefined, {}, { crew: 'nope' }, { status_message: 'Invalid API key' }]) {
      expect(directorName(response)).toBeNull();
    }
  });

  it('picks the one director out of the crew', () => {
    expect(
      directorName(
        credits(
          { name: 'Bong Joon Ho', job: 'Screenplay' },
          { name: 'Kwak Sin-ae', job: 'Producer' },
          { name: '  Bong Joon Ho ', job: 'Director' },
        ),
      ),
    ).toBe('Bong Joon Ho');
  });

  it('joins several directors in TMDB order, each once', () => {
    expect(
      directorName(
        credits(
          { name: 'Lana Wachowski', job: 'Director' },
          { name: 'Lilly Wachowski', job: 'Writer' },
          { name: 'Lilly Wachowski', job: 'Director' },
          { name: 'Lana Wachowski', job: 'Director' },
        ),
      ),
    ).toBe('Lana Wachowski, Lilly Wachowski');
  });

  it('ignores directors without a usable name', () => {
    expect(directorName(credits({ job: 'Director' }, { name: '  ', job: 'Director' }, { name: 7, job: 'Director' }))).toBeNull();
  });
});

describe('creditsUrl', () => {
  it("asks TMDB for the film's credits", () => {
    expect(creditsUrl('496243')).toBe(`${TMDB_API}/movie/496243/credits?language=en-US`);
  });
});

describe('readDirectorIds', () => {
  it('is null when the body is not a director request', () => {
    for (const body of [null, undefined, {}, { query: 'parasite' }, { directorsFor: 5 }]) {
      expect(readDirectorIds(body)).toBeNull();
    }
  });

  it('keeps whole positive ids once each', () => {
    expect(readDirectorIds({ directorsFor: [3, 3, 0, -1, 1.5, '4', null, 9] })).toEqual([3, 9]);
  });

  it(`caps a request at ${MAX_DIRECTOR_LOOKUPS} films`, () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 1);
    expect(readDirectorIds({ directorsFor: ids })).toHaveLength(MAX_DIRECTOR_LOOKUPS);
  });
});

describe('fillDirectors', () => {
  function fakeDeps(movies: DirectorTarget[], tmdb: Record<string, unknown>) {
    const calls = { urls: [] as string[], saved: [] as [number, string][], loaded: [] as number[][] };
    const logged: string[] = [];
    const deps: DirectorDeps = {
      fetchTmdb: async (url) => {
        calls.urls.push(url);
        const answer = tmdb[url];
        if (answer instanceof Error) {
          throw answer;
        }
        return answer;
      },
      loadMovies: async (ids) => {
        calls.loaded.push(ids);
        return movies.filter((movie) => ids.includes(movie.id));
      },
      saveDirector: async (id, director) => {
        calls.saved.push([id, director]);
      },
      logError: (message) => logged.push(message),
    };
    return { deps, calls, logged };
  }

  const film = (id: number, director: string | null = null, provider = 'tmdb'): DirectorTarget => ({
    id,
    provider,
    provider_movie_id: String(id * 10),
    director,
  });

  it('looks up and saves only the directors that are missing', async () => {
    const { deps, calls } = fakeDeps([film(1), film(2, 'Already Known')], {
      [creditsUrl('10')]: credits({ name: 'Bong Joon Ho', job: 'Director' }),
    });

    expect(await fillDirectors([1, 2], deps)).toEqual([
      { id: 1, director: 'Bong Joon Ho' },
      { id: 2, director: 'Already Known' },
    ]);
    expect(calls.urls).toEqual([creditsUrl('10')]);
    expect(calls.saved).toEqual([[1, 'Bong Joon Ho']]);
  });

  it('saves nothing and returns null when TMDB lists no director', async () => {
    const { deps, calls } = fakeDeps([film(1)], { [creditsUrl('10')]: credits() });

    expect(await fillDirectors([1], deps)).toEqual([{ id: 1, director: null }]);
    expect(calls.saved).toEqual([]);
  });

  it('keeps going when one lookup fails', async () => {
    const { deps, calls, logged } = fakeDeps([film(1), film(2)], {
      [creditsUrl('10')]: new Error('TMDB responded with 429.'),
      [creditsUrl('20')]: credits({ name: 'Céline Sciamma', job: 'Director' }),
    });

    expect(await fillDirectors([1, 2], deps)).toEqual([
      { id: 1, director: null },
      { id: 2, director: 'Céline Sciamma' },
    ]);
    expect(calls.saved).toEqual([[2, 'Céline Sciamma']]);
    expect(logged).toEqual(['Looking up the director of movie 1 failed.']);
  });

  it('never asks TMDB about a film that is not from TMDB', async () => {
    const { deps, calls } = fakeDeps([film(1, null, 'sample')], {});

    expect(await fillDirectors([1], deps)).toEqual([{ id: 1, director: null }]);
    expect(calls.urls).toEqual([]);
  });

  it('leaves out ids that are not saved films', async () => {
    const { deps } = fakeDeps([film(1, 'Known')], {});

    expect(await fillDirectors([1, 99], deps)).toEqual([{ id: 1, director: 'Known' }]);
  });

  it('does nothing for no ids', async () => {
    const { deps, calls } = fakeDeps([], {});

    expect(await fillDirectors([], deps)).toEqual([]);
    expect(calls.loaded).toEqual([]);
  });
});
