import {
  buildTakes,
  placementIn,
  placementLabel,
  type RankedRow,
  rankedUserIds,
  type ReviewRow,
  spokenPlacement,
  userIdsOnPage,
  type WatchedRow,
} from '@/services/movie-page';

const review = (user_id: string, body: string, updated_at = '2026-11-01T00:00:00Z', visibility = 'friends'): ReviewRow => ({
  user_id,
  body,
  visibility,
  updated_at,
});
const watched = (user_id: string, rank_position: number | null): WatchedRow => ({ user_id, rank_position });

const usernames = new Map([
  ['me', 'alex'],
  ['f1', 'bea'],
  ['f2', 'Cam'],
  ['f3', 'ada'],
  ['s1', 'stranger'],
  ['s2', 'other'],
]);

describe('placementLabel', () => {
  it('shows the place and how many films were ranked', () => {
    expect(placementLabel({ position: 4, outOf: 62, score: null })).toBe('#4 of 62');
  });

  it('leaves out "of 1" for a list of one', () => {
    expect(placementLabel({ position: 1, outOf: 1, score: null })).toBe('#1');
  });
});

describe('placement scores (#60)', () => {
  it('shows and reads out the score after the place', () => {
    expect(placementLabel({ position: 4, outOf: 62, score: 8.7 })).toBe('#4 of 62 · 8.7');
    expect(placementLabel({ position: 1, outOf: 1, score: 10 })).toBe('#1 · 10.0');
    expect(spokenPlacement({ position: 4, outOf: 62, score: 8.7 })).toBe('ranked 4th of 62, score 8.7');
  });

  it('scores a place from its tier, whatever order the rows come in', () => {
    const rows: RankedRow[] = [
      { rank_position: 3, tier: 'okay' },
      { rank_position: 1, tier: 'loved' },
      { rank_position: 2, tier: 'loved' },
    ];

    expect(placementIn(rows, 1)).toEqual({ position: 1, outOf: 3, score: 10 });
    expect(placementIn(rows, 2)).toEqual({ position: 2, outOf: 3, score: 6.7 });
    expect(placementIn(rows, 3)).toEqual({ position: 3, outOf: 3, score: 6.6 });
  });

  it('shows no score when a tier can’t be read, rather than a wrong one', () => {
    expect(placementIn([{ rank_position: 1, tier: null }], 1)).toEqual({ position: 1, outOf: 1, score: null });
    expect(placementIn([], 2)).toEqual({ position: 2, outOf: 2, score: null });
  });
});

describe('spokenPlacement', () => {
  it('reads the place as an ordinal', () => {
    expect(spokenPlacement({ position: 1, outOf: 3, score: null })).toBe('ranked 1st of 3');
    expect(spokenPlacement({ position: 2, outOf: 3, score: null })).toBe('ranked 2nd of 3');
    expect(spokenPlacement({ position: 3, outOf: 30, score: null })).toBe('ranked 3rd of 30');
    expect(spokenPlacement({ position: 11, outOf: 30, score: null })).toBe('ranked 11th of 30');
    expect(spokenPlacement({ position: 22, outOf: 30, score: null })).toBe('ranked 22nd of 30');
    expect(spokenPlacement({ position: 1, outOf: 1, score: null })).toBe('ranked 1st');
  });
});

describe('rankedUserIds and userIdsOnPage', () => {
  it('lists each ranked user once', () => {
    expect(rankedUserIds([watched('me', 2), watched('f1', null), watched('f2', 5)])).toEqual(['me', 'f2']);
  });

  it('lists everyone on the page once', () => {
    expect(userIdsOnPage([review('s1', 'x'), review('f1', 'y')], [watched('f1', 1), watched('me', null)])).toEqual([
      's1',
      'f1',
      'me',
    ]);
  });
});

describe('buildTakes', () => {
  /** A ranking of `size` films, all in one tier. */
  const ranking = (size: number, tier = 'okay'): RankedRow[] =>
    Array.from({ length: size }, (_, i) => ({ rank_position: i + 1, tier }));
  const rankings = new Map([
    ['me', [...ranking(5, 'loved'), ...ranking(15).map((r) => ({ ...r, rank_position: r.rank_position + 5 }))]],
    ['f1', ranking(62)],
    ['f2', ranking(8, 'loved')],
  ]);

  it('sorts rows into your take, friends, and other people’s public reviews', () => {
    const takes = buildTakes({
      myId: 'me',
      reviews: [
        review('me', 'Mine.', '2026-11-03T00:00:00Z', 'public'),
        review('f1', 'Friend review.'),
        review('s1', 'Older public.', '2026-11-01T00:00:00Z', 'public'),
        review('s2', 'Newer public.', '2026-11-05T00:00:00Z', 'public'),
      ],
      watched: [watched('me', 3), watched('f1', 4), watched('f2', 1), watched('f3', null)],
      rankings,
      usernames,
    });

    expect(takes.mine).toEqual({
      userId: 'me',
      username: 'alex',
      placement: { position: 3, outOf: 20, score: 8.4 },
      review: { body: 'Mine.', visibility: 'public', updatedAt: '2026-11-03T00:00:00Z' },
    });
    // Best-placed first; the friend who hasn't ranked it comes last.
    expect(takes.friends.map((t) => [t.username, t.placement && placementLabel(t.placement), t.review?.body])).toEqual([
      ['Cam', '#1 of 8 · 10.0', undefined],
      ['bea', '#4 of 62 · 6.4', 'Friend review.'],
      ['ada', null, undefined],
    ]);
    // Non-friends never get a placement, since their rankings aren't visible.
    expect(takes.others.map((t) => [t.username, t.placement, t.review?.body])).toEqual([
      ['other', null, 'Newer public.'],
      ['stranger', null, 'Older public.'],
    ]);
  });

  it('has no take of yours when the movie isn’t on your list', () => {
    const takes = buildTakes({
      myId: 'me',
      reviews: [review('s1', 'Public.', undefined, 'public')],
      watched: [],
      rankings: new Map(),
      usernames,
    });

    expect(takes.mine).toBeNull();
    expect(takes.friends).toEqual([]);
    expect(takes.others).toHaveLength(1);
  });

  it('puts unranked friends in username order and names unknown accounts', () => {
    const takes = buildTakes({
      myId: 'me',
      reviews: [],
      watched: [watched('f1', null), watched('zz', null), watched('f3', null)],
      rankings: new Map(),
      usernames,
    });

    expect(takes.friends.map((t) => t.username)).toEqual(['ada', 'bea', 'Someone']);
  });

  it('treats an unexpected stored visibility as friends only', () => {
    const takes = buildTakes({
      myId: 'me',
      reviews: [review('me', 'Mine.', undefined, 'weird')],
      watched: [watched('me', null)],
      rankings: new Map(),
      usernames,
    });

    expect(takes.mine?.review?.visibility).toBe('friends');
    expect(takes.mine?.placement).toBeNull();
  });
});
