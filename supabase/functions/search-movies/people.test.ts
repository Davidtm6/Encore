import { matchingPerson, MAX_PERSON_FILMS, personFilms, personFilmsUrl, personSearchUrl } from './people.ts';
import { TMDB_API } from './tmdb.ts';

const people = (...results: object[]) => ({ page: 1, results });
const nolan = { id: 525, name: 'Christopher Nolan', known_for_department: 'Directing', adult: false };
const hanks = { id: 31, name: 'Tom Hanks', known_for_department: 'Acting', adult: false };

describe('personSearchUrl and personFilmsUrl', () => {
  it('searches people without adult results and encodes the query', () => {
    expect(personSearchUrl('bong & joon')).toBe(
      `${TMDB_API}/search/person?query=bong+%26+joon&include_adult=false&language=en-US&page=1`,
    );
  });

  it('asks for a person’s movie credits', () => {
    expect(personFilmsUrl(525)).toBe(`${TMDB_API}/person/525/movie_credits?language=en-US`);
  });
});

describe('matchingPerson', () => {
  it('finds a director from their last name', () => {
    expect(matchingPerson('nolan', people(nolan))).toEqual({ id: 525, name: 'Christopher Nolan', role: 'director' });
  });

  it('finds an actor from the start of each name, ignoring case and order', () => {
    expect(matchingPerson('HANKS tom', people(hanks))).toEqual({ id: 31, name: 'Tom Hanks', role: 'actor' });
    expect(matchingPerson('tom han', people(hanks))?.name).toBe('Tom Hanks');
  });

  it('ignores accents and punctuation', () => {
    const bong = { id: 21684, name: 'Bong Joon-ho', known_for_department: 'Directing' };
    expect(matchingPerson('joon ho', people(bong))?.role).toBe('director');
    const almodovar = { id: 309, name: 'Pedro Almodóvar', known_for_department: 'Directing' };
    expect(matchingPerson('almodovar', people(almodovar))?.id).toBe(309);
  });

  it('only looks at TMDB’s best match', () => {
    expect(matchingPerson('tom hanks', people({ ...nolan }, hanks))).toBeNull();
  });

  it('ignores a title that only shares a word with someone’s name', () => {
    // TMDB matches people loosely; "the dark knight" doesn't name anyone.
    const knight = { id: 1, name: 'Dark Knight', known_for_department: 'Acting' };
    expect(matchingPerson('the dark knight', people(knight))).toBeNull();
  });

  it('ignores very short queries', () => {
    expect(matchingPerson('to', people(hanks))).toBeNull();
  });

  it('ignores people known for jobs other than acting or directing', () => {
    expect(matchingPerson('zimmer', people({ id: 947, name: 'Hans Zimmer', known_for_department: 'Sound' }))).toBeNull();
  });

  it('ignores adult results and anything malformed', () => {
    for (const response of [
      null,
      {},
      people(),
      people({ ...hanks, adult: true }),
      people({ ...hanks, id: 'x' }),
      people({ ...hanks, name: null }),
    ]) {
      expect(matchingPerson('tom hanks', response)).toBeNull();
    }
  });
});

describe('personFilms', () => {
  it('lists an actor’s films, most voted first', () => {
    const credits = {
      cast: [
        { id: 1, title: 'Small', vote_count: 10 },
        { id: 2, title: 'Big', vote_count: 9000 },
        { id: 3, title: 'Upcoming' },
      ],
      crew: [{ id: 4, title: 'Produced', job: 'Producer', vote_count: 99999 }],
    };
    expect(personFilms('actor', credits).map((film) => film.id)).toEqual([2, 1, 3]);
  });

  it('lists only the films a director directed, once each', () => {
    const credits = {
      cast: [{ id: 9, title: 'Cameo', vote_count: 50000 }],
      crew: [
        { id: 1, title: 'Inception', job: 'Director', vote_count: 30000 },
        { id: 1, title: 'Inception', job: 'Writer', vote_count: 30000 },
        { id: 2, title: 'Following', job: 'Director', vote_count: 2000 },
        { id: 2, title: 'Following', job: 'Director', vote_count: 2000 },
        { id: 3, title: 'Man of Steel', job: 'Story', vote_count: 15000 },
      ],
    };
    expect(personFilms('director', credits).map((film) => film.id)).toEqual([1, 2]);
  });

  it(`keeps at most ${MAX_PERSON_FILMS}`, () => {
    const cast = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, title: `Film ${i}`, vote_count: i }));
    const films = personFilms('actor', { cast });
    expect(films).toHaveLength(MAX_PERSON_FILMS);
    expect(films[0].id).toBe(50);
  });

  it('returns nothing for a response without credits', () => {
    expect(personFilms('actor', null)).toEqual([]);
    expect(personFilms('director', { cast: [] })).toEqual([]);
    expect(personFilms('actor', { cast: [null, { title: 'No id' }] })).toEqual([]);
  });
});
