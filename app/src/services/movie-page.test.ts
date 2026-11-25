import {
  buildTakes,
  placementLabel,
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
    expect(placementLabel({ position: 4, outOf: 62 })).toBe('#4 of 62');
  });

  it('leaves out "of 1" for a list of one', () => {
    expect(placementLabel({ position: 1, outOf: 1 })).toBe('#1');
  });
});

describe('spokenPlacement', () => {
  it('reads the place as an ordinal', () => {
    expect(spokenPlacement({ position: 1, outOf: 3 })).toBe('ranked 1st of 3');
    expect(spokenPlacement({ position: 2, outOf: 3 })).toBe('ranked 2nd of 3');
    expect(spokenPlacement({ position: 3, outOf: 30 })).toBe('ranked 3rd of 30');
    expect(spokenPlacement({ position: 11, outOf: 30 })).toBe('ranked 11th of 30');
    expect(spokenPlacement({ position: 22, outOf: 30 })).toBe('ranked 22nd of 30');
    expect(spokenPlacement({ position: 1, outOf: 1 })).toBe('ranked 1st');
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
  const rankedCounts = new Map([
    ['me', 20],
    ['f1', 62],
    ['f2', 8],
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
      rankedCounts,
      usernames,
    });

    expect(takes.mine).toEqual({
      userId: 'me',
      username: 'alex',
      placement: { position: 3, outOf: 20 },
      review: { body: 'Mine.', visibility: 'public', updatedAt: '2026-11-03T00:00:00Z' },
    });
    // Best-placed first; the friend who hasn't ranked it comes last.
    expect(takes.friends.map((t) => [t.username, t.placement && placementLabel(t.placement), t.review?.body])).toEqual([
      ['Cam', '#1 of 8', undefined],
      ['bea', '#4 of 62', 'Friend review.'],
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
      rankedCounts: new Map(),
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
      rankedCounts: new Map(),
      usernames,
    });

    expect(takes.friends.map((t) => t.username)).toEqual(['ada', 'bea', 'Someone']);
  });

  it('treats an unexpected stored visibility as friends only', () => {
    const takes = buildTakes({
      myId: 'me',
      reviews: [review('me', 'Mine.', undefined, 'weird')],
      watched: [watched('me', null)],
      rankedCounts: new Map(),
      usernames,
    });

    expect(takes.mine?.review?.visibility).toBe('friends');
    expect(takes.mine?.placement).toBeNull();
  });
});
