import { useEffect, useState } from 'react';

import { messageOf } from '@/services/errors';
import { searchMovies, type SearchOutcome } from '@/services/movie-service';

// Each search calls TMDB, so wait for a short pause in typing.
const DEBOUNCE_MS = 400;

const NOTHING: SearchOutcome = { movies: [], suggestions: [], fromSaved: false };

export function useMovieSearch() {
  const [query, setQuery] = useState('');
  // The last answer and the search it belongs to. It stays on screen while the
  // next search loads, so the list is never blank in between.
  const [found, setFound] = useState<{ query: string; outcome: SearchOutcome }>({ query: '', outcome: NOTHING });
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The search that has finished, whether it worked or not.
  const [settled, setSettled] = useState<string | null>(null);
  const wanted = `${attempt}:${query.trim()}`;

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const outcome = await searchMovies(query);
        if (current) {
          setFound({ query: query.trim(), outcome });
          setError(null);
        }
      } catch (e) {
        if (current) {
          setError(messageOf(e));
        }
      } finally {
        if (current) {
          setSettled(`${attempt}:${query.trim()}`);
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  return {
    query,
    setQuery,
    results: found.outcome.movies,
    /** Near matches to offer when `results` is empty. */
    suggestions: found.outcome.suggestions,
    /** True when live search was unavailable and `results` is only films already saved. */
    fromSaved: found.outcome.fromSaved,
    /** The search that `results` and `suggestions` answer, which trails `query` while loading. */
    searchedQuery: found.query,
    // Loading starts with the first keystroke, not after the typing pause.
    loading: settled !== wanted,
    error,
    retry: () => setAttempt((n) => n + 1),
  };
}
