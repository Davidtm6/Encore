/**
 * How My List arranges your films (#82): the sections for each sort, and the
 * grid's rows. No React Native or Supabase imports, so Jest can test it.
 */

export type ListView = 'list' | 'grid';
export type ListSort = 'score' | 'recent';

export const VIEW_OPTIONS: readonly { value: ListView; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
];

export const SORT_OPTIONS: readonly { value: ListSort; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'recent', label: 'Recently added' },
];

/** What the layout needs from a film on the list. */
export interface ListItem {
  movie: { id: number; title: string };
  rankPosition: number | null;
  /** When it was marked watched, as an ISO timestamp. */
  addedAt: string;
}

export interface ListSection<T> {
  key: string;
  title: string;
  data: T[];
}

/**
 * The list's sections. By score: films waiting to be ranked first, so the next
 * step is at the top (#50), then your ranking best first (scores fall with
 * rank). Recently added: every film, newest first. Empty sections are left out.
 */
export function listSections<T extends ListItem>(items: readonly T[], sort: ListSort): ListSection<T>[] {
  if (sort === 'recent') {
    const all = [...items].sort(newestFirst);
    return all.length > 0 ? [{ key: 'recent', title: 'Recently added', data: all }] : [];
  }
  const unranked = items.filter((item) => item.rankPosition === null).sort(newestFirst);
  const ranked = items
    .filter((item) => item.rankPosition !== null)
    .sort((a, b) => a.rankPosition! - b.rankPosition!);
  return [
    { key: 'unranked', title: `Waiting to be ranked (${unranked.length})`, data: unranked },
    { key: 'ranked', title: 'Your ranking', data: ranked },
  ].filter((section) => section.data.length > 0);
}

/** Where a film is in the sections, for scrolling to it; null when it isn't there. */
export function locate<T extends ListItem>(
  sections: readonly ListSection<T>[],
  movieId: number,
): { sectionIndex: number; itemIndex: number } | null {
  for (const [sectionIndex, section] of sections.entries()) {
    const itemIndex = section.data.findIndex((item) => item.movie.id === movieId);
    if (itemIndex !== -1) {
      return { sectionIndex, itemIndex };
    }
  }
  return null;
}

/** The smallest a grid tile gets before the grid drops a column. */
export const MIN_TILE_WIDTH = 100;

/** How many posters fit across `width`, with `gap` between them: at least 3, like a phone. */
export function gridColumns(width: number, gap: number): number {
  return Math.max(3, Math.floor((width + gap) / (MIN_TILE_WIDTH + gap)));
}

/** Splits `items` into rows of `size` for the grid; the last row may be short. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/** Reads a saved choice, falling back when it's missing or from an older version. */
export function readChoice<T extends string>(saved: string | null, options: readonly { value: T }[], fallback: T): T {
  return options.find((option) => option.value === saved)?.value ?? fallback;
}

function newestFirst(a: ListItem, b: ListItem): number {
  return b.addedAt.localeCompare(a.addedAt) || a.movie.title.localeCompare(b.movie.title);
}
