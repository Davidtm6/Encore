import { useEffect, useState } from 'react';

import { messageOf } from '@/services/errors';
import { searchMovies, type Movie } from '@/services/movie-service';

// Each search calls TMDB, so wait for a short pause in typing.
const DEBOUNCE_MS = 400;

export function useMovieSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const movies = await searchMovies(query);
        if (current) {
          setResults(movies);
          setError(null);
        }
      } catch (e) {
        if (current) {
          setError(messageOf(e));
        }
      } finally {
        if (current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  return { query, setQuery, results, loading, error, retry: () => setAttempt((n) => n + 1) };
}
