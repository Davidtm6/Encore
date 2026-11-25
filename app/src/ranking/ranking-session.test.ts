import {
  choose,
  comparisonsLeft,
  finalOrder,
  isDone,
  neighbors,
  nextOpponent,
  placeRange,
  progressFraction,
  skip,
  startRanking,
  tierBounds,
  type RankingSession,
} from './ranking-session';
import type { Tier } from './score';

/** Answers every comparison as if the movie belongs at `desired`. */
function rankAt(ranked: readonly number[], movie: number, desired: number) {
  let session: RankingSession<number> = startRanking(ranked, movie);
  let comparisons = 0;
  for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
    comparisons++;
    session = choose(session, desired <= session.others.indexOf(opponent));
  }
  return { order: finalOrder(session), comparisons };
}

describe('ranking session', () => {
  it('places the first movie in an empty list without comparisons', () => {
    const session = startRanking<string>([], 'Arrival');

    expect(isDone(session)).toBe(true);
    expect(nextOpponent(session)).toBeUndefined();
    expect(finalOrder(session)).toEqual(['Arrival']);
  });

  it('finds every position in at most ceil(log2(n + 1)) comparisons', () => {
    for (let size = 0; size <= 128; size++) {
      const ranked = Array.from({ length: size }, (_, i) => i);
      for (let desired = 0; desired <= size; desired++) {
        const { order, comparisons } = rankAt(ranked, -1, desired);

        expect(order.indexOf(-1)).toBe(desired);
        expect(order.filter((movie) => movie !== -1)).toEqual(ranked);
        expect(comparisons).toBeLessThanOrEqual(Math.ceil(Math.log2(size + 1)));
      }
    }
  });

  it('never changes the saved list, so canceling leaves it intact', () => {
    const ranked = Object.freeze(['A', 'B', 'C']);
    const start = startRanking(ranked, 'D');
    const answered = choose(start, true);

    expect(ranked).toEqual(['A', 'B', 'C']);
    expect(start).not.toBe(answered);
    expect(nextOpponent(start)).toBe('B');
  });

  it('rejects answers after the position is known', () => {
    const session = choose(startRanking(['A'], 'B'), false);

    expect(isDone(session)).toBe(true);
    expect(() => choose(session, true)).toThrow('already finished');
  });

  it('rejects the final order before the position is known', () => {
    expect(() => finalOrder(startRanking(['A'], 'B'))).toThrow('still needs answers');
  });
});

describe('progress (#51)', () => {
  it('never says fewer comparisons are left than are actually asked', () => {
    for (let size = 0; size <= 64; size++) {
      const ranked = Array.from({ length: size }, (_, i) => i);
      for (let desired = 0; desired <= size; desired++) {
        let session: RankingSession<number> = startRanking(ranked, -1);
        let asked = 0;
        const promised = comparisonsLeft(session);
        for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
          // Each answer uses up at least one of the comparisons promised before it.
          const before = comparisonsLeft(session);
          session = choose(session, desired <= session.others.indexOf(opponent));
          asked++;
          expect(comparisonsLeft(session)).toBeLessThanOrEqual(before - 1);
        }

        expect(asked).toBeLessThanOrEqual(promised);
        expect(comparisonsLeft(session)).toBe(0);
      }
    }
  });

  it('starts at ceil(log2(n + 1))', () => {
    expect(comparisonsLeft(startRanking([], 'A'))).toBe(0);
    expect(comparisonsLeft(startRanking(['A'], 'B'))).toBe(1);
    expect(comparisonsLeft(startRanking(Array.from({ length: 10 }, (_, i) => i), -1))).toBe(4);
  });

  it('can go back a step by keeping the earlier session', () => {
    const start = startRanking(['A', 'B', 'C'], 'D');
    const wrong = choose(start, false);

    // The hook keeps `start`; going back means using it again.
    expect(nextOpponent(wrong)).toBe('C');
    expect(nextOpponent(start)).toBe('B');
    expect(finalOrder(choose(choose(start, true), true))).toEqual(['D', 'A', 'B', 'C']);
  });
});

/** Every ranking of a new movie into lists of 0–64 films, answered as if it belongs at `desired`. */
function* everyRanking() {
  for (let size = 0; size <= 64; size++) {
    const ranked = Array.from({ length: size }, (_, i) => i);
    for (let desired = 0; desired <= size; desired++) {
      yield { ranked, desired };
    }
  }
}

describe('progress bar (#62)', () => {
  it('only grows after an answer, for every insertion position, and ends full', () => {
    for (const { ranked, desired } of everyRanking()) {
      let session: RankingSession<number> = startRanking(ranked, -1);
      let answered = 0;
      let fraction = progressFraction(answered, comparisonsLeft(session));
      for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
        session = choose(session, desired <= session.others.indexOf(opponent));
        answered++;
        const next = progressFraction(answered, comparisonsLeft(session));
        expect(next).toBeGreaterThan(fraction);
        fraction = next;
      }

      expect(fraction).toBe(1);
    }
  });

  it('starts empty when there are questions, and is full when there are none', () => {
    expect(progressFraction(0, 4)).toBe(0);
    expect(progressFraction(0, 0)).toBe(1);
    expect(progressFraction(2, 2)).toBe(0.5);
  });
});

describe('placeRange (#63)', () => {
  it('starts as the whole list, counting the new movie', () => {
    expect(placeRange(startRanking(Array.from({ length: 10 }, (_, i) => i), -1))).toEqual({
      best: 1,
      worst: 11,
      total: 11,
    });
  });

  it('shrinks with every answer and always contains the final place', () => {
    for (const { ranked, desired } of everyRanking()) {
      let session: RankingSession<number> = startRanking(ranked, -1);
      const finalPlace = desired + 1;
      let range = placeRange(session);
      expect(range.best).toBeLessThanOrEqual(finalPlace);
      expect(range.worst).toBeGreaterThanOrEqual(finalPlace);
      for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
        session = choose(session, desired <= session.others.indexOf(opponent));
        const next = placeRange(session);
        expect(next.worst - next.best).toBeLessThan(range.worst - range.best);
        expect(next.best).toBeLessThanOrEqual(finalPlace);
        expect(next.worst).toBeGreaterThanOrEqual(finalPlace);
        range = next;
      }

      expect(range).toEqual({ best: finalPlace, worst: finalPlace, total: ranked.length + 1 });
    }
  });

  it('re-ranking counts the list without the movie twice', () => {
    expect(placeRange(startRanking(['A', 'B', 'C'], 'B'))).toEqual({ best: 1, worst: 3, total: 3 });
  });
});

describe('neighbors', () => {
  it('names the movies directly above and below the new place', () => {
    const session = choose(choose(startRanking(['A', 'B', 'C'], 'D'), true), false);

    expect(finalOrder(session)).toEqual(['A', 'D', 'B', 'C']);
    expect(neighbors(session)).toEqual({ above: 'A', below: 'B' });
  });

  it('has nothing above a new number one or below a new last place', () => {
    const top = choose(choose(startRanking(['A', 'B'], 'C'), true), true);
    const bottom = choose(startRanking(['A', 'B'], 'C'), false);

    expect(neighbors(top)).toEqual({ above: undefined, below: 'A' });
    expect(neighbors(bottom)).toEqual({ above: 'B', below: undefined });
    expect(neighbors(startRanking([], 'A'))).toEqual({ above: undefined, below: undefined });
  });

  it('is only known once the ranking is finished', () => {
    expect(() => neighbors(startRanking(['A'], 'B'))).toThrow('still needs answers');
  });
});

describe('re-ranking', () => {
  it('keeps every other movie in its relative order', () => {
    const ranked = [10, 20, 30, 40, 50, 60];
    for (let desired = 0; desired < ranked.length; desired++) {
      const { order } = rankAt(ranked, 30, desired);

      expect(order.indexOf(30)).toBe(desired);
      expect(order.filter((movie) => movie !== 30)).toEqual([10, 20, 40, 50, 60]);
    }
  });

  it('can land the movie back in its old position', () => {
    const ranked = [10, 20, 30, 40, 50];

    expect(rankAt(ranked, 40, 3).order).toEqual(ranked);
  });

  it('finishes immediately when re-ranking the only movie', () => {
    const session = startRanking([10], 10);

    expect(isDone(session)).toBe(true);
    expect(finalOrder(session)).toEqual([10]);
  });
});

/**
 * Large lists (#64). The lists above go up to 128 films; testers may get to
 * hundreds. Films are the numbers 0..n-1 in best-first order, so a film's
 * value is its index and answers need no lookup.
 */
describe('large lists (#64)', () => {
  /** Comparisons to place a new film at `desired` in a list of `size`, checking where it lands. */
  function comparisonsToPlace(size: number, desired: number): number {
    const ranked = Array.from({ length: size }, (_, i) => i);
    let session: RankingSession<number> = startRanking(ranked, -1);
    let comparisons = 0;
    for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
      comparisons++;
      session = choose(session, desired <= opponent);
    }
    expect(finalOrder(session).indexOf(-1)).toBe(desired);
    return comparisons;
  }

  it.each([200, 500, 1000])(
    'places a film anywhere in a list of %i in floor(log2(n + 1)) to ceil(log2(n + 1)) comparisons',
    (size) => {
      const fewest = Math.floor(Math.log2(size + 1));
      const most = Math.ceil(Math.log2(size + 1));
      for (let desired = 0; desired <= size; desired++) {
        const comparisons = comparisonsToPlace(size, desired);
        if (comparisons < fewest || comparisons > most) {
          throw new Error(`size ${size}, place ${desired}: ${comparisons} comparisons, expected ${fewest}–${most}`);
        }
      }
    },
  );

  // The numbers recorded in docs/testing.md ("Ranking large lists"). If the
  // engine changes, update the table there too.
  it.each([
    { size: 100, top: 7, bottom: 6, middle: 6, average: 6.73 },
    { size: 200, top: 8, bottom: 7, middle: 7, average: 7.73 },
    { size: 500, top: 9, bottom: 8, middle: 8, average: 8.98 },
    { size: 1000, top: 10, bottom: 9, middle: 9, average: 9.98 },
  ])('a list of $size takes $top at #1, $bottom at the bottom, $middle in the middle', (row) => {
    const counts = Array.from({ length: row.size + 1 }, (_, desired) => comparisonsToPlace(row.size, desired));
    const average = counts.reduce((sum, n) => sum + n, 0) / counts.length;

    expect(counts[0]).toBe(row.top);
    expect(counts[row.size]).toBe(row.bottom);
    expect(counts[Math.floor(row.size / 2)]).toBe(row.middle);
    expect(average).toBeCloseTo(row.average, 2);
  });

  it.each([
    { films: 100, worst: 573, best: 480 },
    { films: 200, worst: 1345, best: 1153 },
    { films: 500, worst: 3989, best: 3498 },
    { films: 1000, worst: 8977, best: 7987 },
  ])('building a list of $films from nothing takes $best to $worst comparisons in all', ({ films, worst, best }) => {
    // Every new film at #1 is the most comparisons per film; every film at the bottom, the fewest.
    let atTop = 0;
    let atBottom = 0;
    for (let size = 0; size < films; size++) {
      atTop += comparisonsToPlace(size, 0);
      atBottom += comparisonsToPlace(size, size);
    }

    expect(atTop).toBe(worst);
    expect(atBottom).toBe(best);
    // The worst case is exactly the engine's promised upper bound summed over the list.
    const sum = (round: (x: number) => number) =>
      Array.from({ length: films }, (_, k) => round(Math.log2(k + 1))).reduce((a, b) => a + b, 0);
    // Both ends match the engine's per-film bounds summed over the list.
    expect(worst).toBe(sum(Math.ceil));
    expect(best).toBe(sum(Math.floor));
  });

  it('places a film within one tier of a 999-film list in 8 or 9 comparisons (#60)', () => {
    // 333 loved, 333 okay, 333 disliked: the tier question narrows 999 films to 333.
    const ranked = Array.from({ length: 999 }, (_, id) => ({ id, tier: (['loved', 'okay', 'disliked'] as const)[Math.floor(id / 333)] }));
    const ids = ranked.map((m) => m.id);
    for (const tier of ['loved', 'okay', 'disliked'] as const) {
      const bounds = tierBounds(ranked, -1, tier);
      for (let desired = bounds.low; desired <= bounds.high; desired++) {
        let session: RankingSession<number> = startRanking(ids, -1, bounds);
        let comparisons = 0;
        for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
          comparisons++;
          session = choose(session, desired <= opponent);
        }
        if (finalOrder(session).indexOf(-1) !== desired || comparisons < 8 || comparisons > 9) {
          throw new Error(`${tier}, place ${desired}: ${comparisons} comparisons`);
        }
      }
    }
  });
});

describe('tiers (#60)', () => {
  /** Ids 0.. best first: `loved` loved movies, then `okay`, then `disliked`. */
  function tiered(loved: number, okay: number, disliked: number) {
    const tiers: Tier[] = [
      ...Array<Tier>(loved).fill('loved'),
      ...Array<Tier>(okay).fill('okay'),
      ...Array<Tier>(disliked).fill('disliked'),
    ];
    return tiers.map((tier, id) => ({ id, tier }));
  }

  it('finds the slice of the list each tier owns', () => {
    const ranked = tiered(3, 4, 2);

    expect(tierBounds(ranked, -1, 'loved')).toEqual({ low: 0, high: 3 });
    expect(tierBounds(ranked, -1, 'okay')).toEqual({ low: 3, high: 7 });
    expect(tierBounds(ranked, -1, 'disliked')).toEqual({ low: 7, high: 9 });
  });

  it('leaves out the movie being re-ranked, so it can change tier', () => {
    // Movie 1 is loved; re-ranked as disliked, the list it joins has 2 loved left.
    expect(tierBounds(tiered(3, 4, 2), 1, 'disliked')).toEqual({ low: 6, high: 8 });
  });

  it('only compares against, and only places within, the chosen tier', () => {
    for (const [loved, okay, disliked] of [[0, 0, 0], [5, 0, 3], [4, 6, 2], [1, 1, 1], [9, 13, 7]]) {
      const ranked = tiered(loved, okay, disliked);
      const ids = ranked.map((m) => m.id);
      for (const tier of ['loved', 'okay', 'disliked'] as const) {
        const bounds = tierBounds(ranked, -1, tier);
        for (let desired = bounds.low; desired <= bounds.high; desired++) {
          let session: RankingSession<number> = startRanking(ids, -1, bounds);
          const promised = comparisonsLeft(session);
          let asked = 0;
          for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
            expect(ranked[opponent].tier).toBe(tier);
            session = choose(session, desired <= session.others.indexOf(opponent));
            asked++;
          }

          expect(finalOrder(session).indexOf(-1)).toBe(desired);
          expect(asked).toBeLessThanOrEqual(promised);
        }
      }
    }
  });

  it('places a movie in an empty tier with no questions, where that tier would start', () => {
    const ranked = tiered(2, 0, 2);
    const session = startRanking(ranked.map((m) => m.id), -1, tierBounds(ranked, -1, 'okay'));

    expect(isDone(session)).toBe(true);
    expect(finalOrder(session)).toEqual([0, 1, -1, 2, 3]);
  });

  it('rejects bounds outside the list', () => {
    expect(() => startRanking([1, 2], 3, { low: 1, high: 3 })).toThrow('outside the list');
    expect(() => startRanking([1, 2], 3, { low: 2, high: 1 })).toThrow('outside the list');
  });
});

describe('skip (#43)', () => {
  it('asks a different movie, and never the same one twice', () => {
    for (let size = 1; size <= 40; size++) {
      let session: RankingSession<number> = startRanking(Array.from({ length: size }, (_, i) => i), -1);
      const asked = new Set<number>();
      for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
        expect(asked.has(opponent)).toBe(false);
        asked.add(opponent);
        session = skip(session);
      }
    }
  });

  it('lands in the middle of the range when every movie left is skipped', () => {
    for (let size = 1; size <= 40; size++) {
      let session: RankingSession<number> = startRanking(Array.from({ length: size }, (_, i) => i), -1);
      while (!isDone(session)) {
        session = skip(session);
      }

      expect(finalOrder(session).indexOf(-1)).toBe(Math.floor(size / 2));
    }
  });

  it('after one skip and honest answers, lands exactly or right beside the skipped movie', () => {
    for (const { ranked, desired } of everyRanking()) {
      if (ranked.length < 2) {
        continue;
      }
      const start = startRanking(ranked, -1);
      const skippedMovie = nextOpponent(start)!;
      let session = skip(start);
      for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
        session = choose(session, desired <= session.others.indexOf(opponent));
      }

      const order = finalOrder(session);
      const landed = order.indexOf(-1);
      if (landed !== desired) {
        // Too close to call: it can only be off by the one movie it was never compared with.
        expect(Math.abs(landed - desired)).toBe(1);
        expect(Math.abs(order.indexOf(skippedMovie) - landed)).toBe(1);
      }
    }
  });

  it('keeps the progress bar moving forward when skips are mixed in', () => {
    for (const { ranked, desired } of everyRanking()) {
      let session: RankingSession<number> = startRanking(ranked, -1);
      let steps = 0;
      let fraction = progressFraction(steps, comparisonsLeft(session));
      for (let opponent = nextOpponent(session); opponent !== undefined; opponent = nextOpponent(session)) {
        // Skip every third step; answer the rest honestly.
        session = steps % 3 === 2 ? skip(session) : choose(session, desired <= session.others.indexOf(opponent));
        steps++;
        const next = progressFraction(steps, comparisonsLeft(session));
        expect(next).toBeGreaterThan(fraction);
        fraction = next;
      }

      expect(fraction).toBe(1);
    }
  });

  it('can be undone by keeping the earlier session', () => {
    const start = startRanking(['A', 'B', 'C'], 'D');
    const skipped = skip(start);

    expect(nextOpponent(start)).toBe('B');
    expect(nextOpponent(skipped)).toBe('C');
    expect(start.skipped.size).toBe(0);
  });
});
