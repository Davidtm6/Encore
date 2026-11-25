import { placeAtTierEnd } from './quick-place';
import type { Tier } from './score';

const list = (...entries: [number, Tier][]) => entries.map(([id, tier]) => ({ id, tier }));

describe('placeAtTierEnd', () => {
  const ranked = list([1, 'loved'], [2, 'loved'], [3, 'okay'], [4, 'disliked'], [5, 'disliked']);

  it('puts the movie at the bottom of its tier', () => {
    expect(placeAtTierEnd(ranked, 9, 'loved')).toEqual({
      order: [1, 2, 9, 3, 4, 5],
      tiers: ['loved', 'loved', 'loved', 'okay', 'disliked', 'disliked'],
      position: 3,
    });
    expect(placeAtTierEnd(ranked, 9, 'okay').order).toEqual([1, 2, 3, 9, 4, 5]);
    expect(placeAtTierEnd(ranked, 9, 'disliked')).toMatchObject({ order: [1, 2, 3, 4, 5, 9], position: 6 });
  });

  it('fills an empty tier between the ones around it', () => {
    const noOkay = list([1, 'loved'], [4, 'disliked']);
    expect(placeAtTierEnd(noOkay, 9, 'okay')).toEqual({
      order: [1, 9, 4],
      tiers: ['loved', 'okay', 'disliked'],
      position: 2,
    });
  });

  it('makes the first movie #1', () => {
    expect(placeAtTierEnd([], 9, 'disliked')).toEqual({ order: [9], tiers: ['disliked'], position: 1 });
  });

  it('moves a movie that is already ranked instead of repeating it', () => {
    expect(placeAtTierEnd(ranked, 1, 'okay')).toEqual({
      order: [2, 3, 1, 4, 5],
      tiers: ['loved', 'okay', 'okay', 'disliked', 'disliked'],
      position: 3,
    });
  });

  it('always gives save_ranking tiers in loved, okay, disliked order', () => {
    const rank = { loved: 0, okay: 1, disliked: 2 };
    for (const tier of ['loved', 'okay', 'disliked'] as const) {
      const { tiers } = placeAtTierEnd(ranked, 9, tier);
      expect(tiers.every((t, i) => i === 0 || rank[tiers[i - 1]] <= rank[t])).toBe(true);
    }
  });
});
