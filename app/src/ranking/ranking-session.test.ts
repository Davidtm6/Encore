import {
  choose,
  finalOrder,
  isDone,
  nextOpponent,
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
