import {
  chunk,
  gridColumns,
  listSections,
  locate,
  type ListItem,
  readChoice,
  SORT_OPTIONS,
  VIEW_OPTIONS,
} from './my-list-layout';

const film = (id: number, rankPosition: number | null, addedAt: string, title = `Film ${id}`): ListItem => ({
  movie: { id, title },
  rankPosition,
  addedAt,
});

// Ranked 1, 2, 3 (ids 10, 11, 12), added in a different order; two unranked.
const films = [
  film(11, 2, '2026-11-03T00:00:00Z'),
  film(20, null, '2026-11-01T00:00:00Z'),
  film(12, 3, '2026-11-05T00:00:00Z'),
  film(10, 1, '2026-11-02T00:00:00Z'),
  film(21, null, '2026-11-04T00:00:00Z'),
];
const ids = (section: { data: ListItem[] }) => section.data.map((item) => item.movie.id);

describe('listSections', () => {
  it('by score: unranked films newest first, then the ranking best first', () => {
    const sections = listSections(films, 'score');

    expect(sections.map((s) => s.title)).toEqual(['Waiting to be ranked (2)', 'Your ranking']);
    expect(ids(sections[0])).toEqual([21, 20]);
    expect(ids(sections[1])).toEqual([10, 11, 12]);
  });

  it('recently added: every film in one section, newest first', () => {
    const sections = listSections(films, 'recent');

    expect(sections).toHaveLength(1);
    expect(ids(sections[0])).toEqual([12, 21, 11, 10, 20]);
  });

  it('breaks ties in added time by title, so the order is stable', () => {
    const same = '2026-11-01T00:00:00Z';
    const sections = listSections([film(1, null, same, 'Zodiac'), film(2, null, same, 'Arrival')], 'recent');

    expect(ids(sections[0])).toEqual([2, 1]);
  });

  it('leaves out empty sections', () => {
    expect(listSections([film(1, 1, '2026-11-01T00:00:00Z')], 'score').map((s) => s.key)).toEqual(['ranked']);
    expect(listSections([], 'score')).toEqual([]);
    expect(listSections([], 'recent')).toEqual([]);
  });

  it('doesn’t reorder the list it was given', () => {
    const before = films.map((f) => f.movie.id);
    listSections(films, 'recent');

    expect(films.map((f) => f.movie.id)).toEqual(before);
  });
});

describe('locate', () => {
  it('finds a film’s section and place, for scrolling to it', () => {
    const sections = listSections(films, 'score');

    expect(locate(sections, 11)).toEqual({ sectionIndex: 1, itemIndex: 1 });
    expect(locate(sections, 20)).toEqual({ sectionIndex: 0, itemIndex: 1 });
    expect(locate(sections, 99)).toBeNull();
  });
});

describe('gridColumns and chunk', () => {
  it('fits 3 posters on a phone and more on a wide screen', () => {
    expect(gridColumns(343, 8)).toBe(3);
    expect(gridColumns(200, 8)).toBe(3);
    expect(gridColumns(752, 8)).toBe(7);
  });

  it('splits into rows, with a short last row', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('readChoice', () => {
  it('reads a saved view or sort, and falls back for anything else', () => {
    expect(readChoice('grid', VIEW_OPTIONS, 'list')).toBe('grid');
    expect(readChoice('recent', SORT_OPTIONS, 'score')).toBe('recent');
    expect(readChoice(null, VIEW_OPTIONS, 'list')).toBe('list');
    expect(readChoice('poster-wall', VIEW_OPTIONS, 'list')).toBe('list');
  });
});
