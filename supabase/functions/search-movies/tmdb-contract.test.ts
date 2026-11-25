import { creditsUrl, directorName } from './credits.ts';
import { matchingPerson, personFilms, personFilmsUrl, personSearchUrl } from './people.ts';
import { tmdbResults, tmdbUrl } from './search.ts';
import { toMovieRows } from './tmdb.ts';
const token = process.env.TMDB_READ_ACCESS_TOKEN;
const describeWithToken = token ? describe : describe.skip;

describeWithToken('TMDB search response', () => {
  it('still returns the fields the search function reads', async() => {
    const response = await fetch(tmdbUrl('parasite'), 
    {headers: {Authorization: `Bearer ${token}`, 
    accept: 'application/json'}, signal: AbortSignal.timeout(10000)});
    expect(response.status).toBe(200);

    const results = tmdbResults(await response.json())
    const film = results.find((movie) => movie.id === 496243);
    expect(film).toEqual(expect.objectContaining({
        title: expect.any(String),
        release_date: expect.any(String),
        poster_path: expect.any(String),
        overview: expect.any(String),
        adult: expect.any(Boolean),
        vote_average: expect.any(Number),
        vote_count: expect.any(Number),
    }));

    const rows = toMovieRows(results);
    expect(rows.map((row)=> row.provider_movie_id)).toContain('496243');
  }, 15000);

  it('still returns the credits fields the director lookup reads', async () => {
    const response = await fetch(creditsUrl('496243'), {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    expect(response.status).toBe(200);

    const credits = await response.json();
    expect(credits.crew).toEqual(
      expect.arrayContaining([expect.objectContaining({ job: 'Director', name: expect.any(String) })]),
    );
    expect(directorName(credits)).toBe('Bong Joon Ho');
  }, 15000);

  it('still returns the person fields the actor and director search reads', async () => {
    const get = async (url: string) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      expect(response.status).toBe(200);
      return response.json();
    };

    const person = matchingPerson('christopher nolan', await get(personSearchUrl('christopher nolan')));
    expect(person).toEqual({ id: 525, name: 'Christopher Nolan', role: 'director' });

    const films = personFilms('director', await get(personFilmsUrl(525)));
    expect(films.map((film) => film.id)).toContain(27205);
    expect(films[0]).toEqual(expect.objectContaining({ title: expect.any(String), vote_count: expect.any(Number) }));
  }, 15000);
});
