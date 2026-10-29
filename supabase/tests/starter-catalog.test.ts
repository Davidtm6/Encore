/**
 * The 50 starter films appear in four SQL files: the seed, the migration that
 * gave them TMDB IDs, the migration that added their posters, and the demo
 * script. These tests read the files and check that they agree.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { POSTER_BASE_URL } from '../functions/search-movies/tmdb.ts';

const supabaseDir = join(__dirname, '..');
const read = (file: string) => readFileSync(join(supabaseDir, file), 'utf8');

const seed = [...read('seed.sql').matchAll(/\('tmdb', '(\d+)', '((?:[^']|'')+)', (\d{4}),\s*'([^']+)'\)/g)].map(
  ([, id, title, year, poster]) => ({ id, title, year: Number(year), poster }),
);
const relabel = [
  ...read('migrations/20261029000000_sample_films_to_tmdb.sql').matchAll(/\('([a-z0-9-]+)', '(\d+)'\)/g),
].map(([, slug, id]) => ({ slug, id }));
const posters = new Map(
  [...read('migrations/20261029010000_starter_film_posters.sql').matchAll(/\('(\d+)', '(https:[^']+)'\)/g)].map(
    ([, id, url]) => [id, url],
  ),
);
const demo = read('demo/demo-account.sql');
const ids = (text: string) => [...text.matchAll(/'(\d+)'/g)].map(([, id]) => id);
const demoRanked = ids(demo.match(/unnest\(array\[([\s\S]*?)\]\)/)?.[1] ?? '');
const demoUnranked = ids(demo.match(/provider_movie_id in \(([^)]*)\)/)?.[1] ?? '');
const demoReviewed = demo.match(/insert into public\.reviews[\s\S]*?provider_movie_id = '(\d+)'/)?.[1];

const seedIds = seed.map((film) => film.id);
const sorted = (values: Iterable<string>) => [...values].sort();

describe('seed.sql', () => {
  it('has 50 starter films with distinct TMDB IDs', () => {
    expect(seed).toHaveLength(50);
    expect(new Set(seedIds).size).toBe(50);
  });

  it('gives every film a plausible year and a poster at the size search saves', () => {
    for (const film of seed) {
      expect(film.year).toBeGreaterThan(1900);
      expect(film.poster).toMatch(new RegExp(`^${POSTER_BASE_URL}/[A-Za-z0-9]+\\.(jpg|png)$`));
    }
  });
});

describe('migration 20261029000000_sample_films_to_tmdb', () => {
  it('relabels exactly the seeded films, once each', () => {
    expect(relabel).toHaveLength(50);
    expect(new Set(relabel.map((pair) => pair.slug)).size).toBe(50);
    expect(sorted(relabel.map((pair) => pair.id))).toEqual(sorted(seedIds));
  });
});

describe('migration 20261029010000_starter_film_posters', () => {
  it('sets the same poster the seed uses for each film', () => {
    expect(sorted(posters.keys())).toEqual(sorted(seedIds));
    for (const film of seed) {
      expect(posters.get(film.id)).toBe(film.poster);
    }
  });
});

describe('demo/demo-account.sql', () => {
  it('ranks 10 seeded films and leaves 3 others unranked', () => {
    expect(demoRanked).toHaveLength(10);
    expect(demoUnranked).toHaveLength(3);
    expect(new Set([...demoRanked, ...demoUnranked]).size).toBe(13);
    for (const id of [...demoRanked, ...demoUnranked]) {
      expect(seedIds).toContain(id);
    }
  });

  it('reviews a film that is in the demo list', () => {
    expect(demoReviewed).toBeDefined();
    expect([...demoRanked, ...demoUnranked]).toContain(demoReviewed);
  });
});
