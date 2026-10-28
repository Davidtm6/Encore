import {insertionIndex} from './ranking';

describe('insertionIndex', () => {
  it('places the first movie in an empty list without comparisons', () => {
    const preferNew = jest.fn();

    expect(insertionIndex([], 'Arrival', preferNew)).toBe(0);
    expect(preferNew).not.toHaveBeenCalled();
  });

  it('finds every position in at most ceil(log2(n + 1)) comparisons', () => {
    for (let size = 0; size <= 128; size++) {
      const ranked = Array.from({length: size}, (_, i) => `film-${i}`);
      for (let desired = 0; desired <= size; desired++) {
        let comparisons = 0;
        const preferNew = (_newMovie: string, opponent: string) => {
          comparisons++;
          return desired <= Number(opponent.split('-')[1]);
        };

        expect(insertionIndex(ranked, 'new-film', preferNew)).toBe(desired);
        expect(comparisons).toBeLessThanOrEqual(Math.ceil(Math.log2(size + 1)));
      }
    }
  });

  it('rejects a duplicate before asking for a comparison', () => {
    const preferNew = jest.fn();

    expect(() => insertionIndex(['Arrival'], 'Arrival', preferNew)).toThrow(
      'already ranked',
    );
    expect(preferNew).not.toHaveBeenCalled();
  });

  it('leaves the list unchanged when the user cancels', () => {
    const ranked = ['A', 'B', 'C'];
    const cancel = () => {
      throw new Error('canceled');
    };

    expect(() => insertionIndex(ranked, 'D', cancel)).toThrow('canceled');
    expect(ranked).toEqual(['A', 'B', 'C']);
  });
});
