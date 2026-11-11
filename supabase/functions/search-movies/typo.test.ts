import { closestTitles, editDistance, looserQueries, MAX_SUGGESTIONS, normalizeTitle } from './typo.ts';

const titles = (...names: string[]) => names.map((title) => ({ title }));

describe('looserQueries', () => {
  it('shortens the last word by one, two, then three letters', () => {
    expect(looserQueries('intersteller')).toEqual(['interstelle', 'interstell', 'interstel']);
  });

  it('keeps the earlier words, then tries the query without its last word', () => {
    expect(looserQueries('dark knigt')).toEqual(['dark knig', 'dark kni', 'dark']);
  });

  it('never shortens a word below three letters', () => {
    expect(looserQueries('dune')).toEqual(['dun']);
    expect(looserQueries('up')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(looserQueries('   ')).toEqual([]);
  });
});

describe('normalizeTitle', () => {
  it('drops case, accents, punctuation, and a leading article', () => {
    expect(normalizeTitle('The Dark Knight')).toBe('dark knight');
    expect(normalizeTitle('Amélie')).toBe('amelie');
    expect(normalizeTitle('WALL·E')).toBe('wall e');
  });

  it('keeps a title that is only an article', () => {
    expect(normalizeTitle('The')).toBe('the');
  });
});

describe('editDistance', () => {
  it('counts insertions, deletions, and substitutions', () => {
    expect(editDistance('intersteller', 'interstellar')).toBe(1);
    expect(editDistance('incepton', 'inception')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('same', 'same')).toBe(0);
  });
});

describe('closestTitles', () => {
  it('puts the nearest title first and drops unrelated ones', () => {
    const found = closestTitles('intersteller', titles('Interstellar Wars', 'Something Else', 'Interstellar'));

    expect(found.map((movie) => movie.title)).toEqual(['Interstellar', 'Interstellar Wars']);
  });

  it('matches the start of a longer title', () => {
    const found = closestTitles('lord of the rigns', titles('The Lord of the Rings: The Two Towers'));

    expect(found).toHaveLength(1);
  });

  it('ignores a leading article in the title', () => {
    expect(closestTitles('dark knigt', titles('The Dark Knight'))).toHaveLength(1);
  });

  it('keeps the given order between equally close titles', () => {
    const found = closestTitles('dune', titles('Dunes', 'Dune', 'Dunk', 'Done'));

    expect(found.map((movie) => movie.title)).toEqual(['Dune', 'Dunes', 'Dunk', 'Done']);
  });

  it(`returns at most ${MAX_SUGGESTIONS} titles`, () => {
    expect(closestTitles('dune', titles('Dune', 'Dune', 'Dune', 'Dune', 'Dune', 'Dune', 'Dune'))).toHaveLength(
      MAX_SUGGESTIONS,
    );
  });

  it('suggests nothing for a query with no letters or digits', () => {
    expect(closestTitles('!!!', titles('Up'))).toEqual([]);
  });
});
