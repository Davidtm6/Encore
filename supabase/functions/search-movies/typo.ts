/**
 * Typo tolerance for search. TMDB has no spelling suggestions, but it matches
 * the start of a word, so a misspelled query is retried with its last word
 * shortened and the results are ranked by how close their titles are to what
 * was typed. This file has no imports and no Deno APIs, so Jest can test it.
 */

/** Most looser queries tried for one misspelled search; each is one TMDB call. */
export const MAX_LOOSER_QUERIES = 4;
/** Most titles offered under "Did you mean". */
export const MAX_SUGGESTIONS = 5;
/** The shortest a shortened word may get; anything shorter matches too much. */
const MIN_WORD_LENGTH = 3;

/**
 * Looser versions of a query that found nothing, most specific first: the last
 * word with one, two, then three letters dropped, then the query without its
 * last word. "intersteller" gives "interstelle", "interstell", "interstel".
 */
export function looserQueries(query: string): string[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const last = words.pop();
  if (!last) {
    return [];
  }
  const looser: string[] = [];
  for (let dropped = 1; dropped <= 3 && last.length - dropped >= MIN_WORD_LENGTH; dropped++) {
    looser.push([...words, last.slice(0, -dropped)].join(' '));
  }
  if (words.length > 0) {
    looser.push(words.join(' '));
  }
  return [...new Set(looser)].slice(0, MAX_LOOSER_QUERIES);
}

/** Lowercase letters and digits only, without accents or a leading article. */
export function normalizeTitle(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an) (?=\S)/, '');
}

/** The number of single-letter insertions, deletions, and substitutions between two strings. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * How far a title is from what was typed. A title that only starts like the
 * query ("Interstellar Wars" for "intersteller") counts as slightly further
 * than one that matches all the way through.
 */
function titleDistance(query: string, title: string): number {
  const whole = editDistance(query, title);
  const start = editDistance(query, title.slice(0, query.length)) + 0.5;
  return Math.min(whole, start);
}

/**
 * The titles closest to a misspelled query, nearest first, keeping the given
 * order between equally close ones. Titles more than about a third of the
 * query's letters away are left out, so unrelated films are never suggested.
 */
export function closestTitles<T extends { title: string }>(query: string, candidates: readonly T[]): T[] {
  const typed = normalizeTitle(query);
  if (!typed) {
    return [];
  }
  const furthest = Math.max(2, Math.ceil(typed.length / 3));
  return candidates
    .map((candidate, index) => ({ candidate, index, distance: titleDistance(typed, normalizeTitle(candidate.title)) }))
    .filter(({ distance }) => distance <= furthest)
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ candidate }) => candidate);
}
