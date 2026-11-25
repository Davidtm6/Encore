import {
  choose,
  comparisonsLeft,
  finalOrder,
  isDone,
  neighbors,
  nextOpponent,
  placeRange,
  progressFraction,
  startRanking,
  type RankingSession,
} from './ranking-session';

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
