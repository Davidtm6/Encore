import { tmdbResults, tmdbUrl } from './search.ts';
import { toMovieRows } from './tmdb.ts';
const token = process.env.TMDB_READ_ACCESS_TOKEN;
const describeWithToken = token ? describe : describe.skip;

describeWithToken('TMDB search response', () => {
  it('still returns the fields toMovieRows reads', async() => {
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
        adult: expect.any(Boolean),
    }));

    const rows = toMovieRows(results);
    expect(rows.map((row)=> row.provider_movie_id)).toContain('496243');
  }, 15000);


});