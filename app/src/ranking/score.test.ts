import { formatScore, readTier, scoreFor, scoresForList, TIERS, type Tier } from './score';

/** A best-first list with `loved`, `okay`, and `disliked` movies in each tier. */
function list(loved: number, okay: number, disliked: number) {
  const tiers: Tier[] = [
    ...Array<Tier>(loved).fill('loved'),
    ...Array<Tier>(okay).fill('okay'),
    ...Array<Tier>(disliked).fill('disliked'),
  ];
  return tiers.map((tier, id) => ({ id, tier }));
}

describe('scoreFor', () => {
  it('gives each tier’s best the top of its band and its worst the bottom', () => {
    expect(scoreFor('loved', 0, 5)).toBe(10);
    expect(scoreFor('loved', 4, 5)).toBe(6.7);
    expect(scoreFor('okay', 0, 3)).toBe(6.6);
    expect(scoreFor('okay', 2, 3)).toBe(3.4);
    expect(scoreFor('disliked', 0, 2)).toBe(3.3);
    expect(scoreFor('disliked', 1, 2)).toBe(0);
  });

  it('gives a tier of one the top of its band', () => {
    expect(scoreFor('loved', 0, 1)).toBe(10);
    expect(scoreFor('okay', 0, 1)).toBe(6.6);
    expect(scoreFor('disliked', 0, 1)).toBe(3.3);
  });

  it('spreads the rest evenly, to one decimal', () => {
    expect([0, 1, 2, 3].map((i) => scoreFor('loved', i, 4))).toEqual([10, 8.9, 7.8, 6.7]);
  });
});

describe('scoresForList', () => {
  it('never scores a movie above one ranked higher, for any mix of tiers', () => {
    for (let loved = 0; loved <= 8; loved++) {
      for (let okay = 0; okay <= 8; okay++) {
        for (let disliked = 0; disliked <= 8; disliked++) {
          const ranked = list(loved, okay, disliked);
          const scores = ranked.map(({ id }) => scoresForList(ranked).get(id)!);
          for (let i = 1; i < scores.length; i++) {
            expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
          }
        }
      }
    }
  });

  it('scores every movie in a better tier above every movie in a worse one', () => {
    const ranked = list(30, 30, 30);
    const scores = scoresForList(ranked);
    const lowest = (tier: Tier) => Math.min(...ranked.filter((m) => m.tier === tier).map((m) => scores.get(m.id)!));
    const highest = (tier: Tier) => Math.max(...ranked.filter((m) => m.tier === tier).map((m) => scores.get(m.id)!));

    expect(lowest('loved')).toBeGreaterThan(highest('okay'));
    expect(lowest('okay')).toBeGreaterThan(highest('disliked'));
  });

  it('scores each tier on its own, whatever the size of the others', () => {
    const scores = scoresForList(list(1, 2, 0));

    expect([...scores.values()]).toEqual([10, 6.6, 3.4]);
  });
});

describe('formatScore and readTier', () => {
  it('always shows one decimal', () => {
    expect(formatScore(10)).toBe('10.0');
    expect(formatScore(0)).toBe('0.0');
    expect(formatScore(7.8)).toBe('7.8');
  });

  it('reads only the three tiers', () => {
    for (const tier of TIERS) {
      expect(readTier(tier)).toBe(tier);
    }
    expect(readTier(null)).toBeNull();
    expect(readTier('great')).toBeNull();
  });
});
