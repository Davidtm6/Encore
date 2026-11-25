import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { messageOf } from '@/services/errors';
import { getMoviePage, type MoviePage } from '@/services/movie-page-service';

/** A movie's page, reloaded whenever it comes into focus (for example after writing a review). */
export function useMoviePage(movieId: number) {
  const [page, setPage] = useState<MoviePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setPage(await getMoviePage(movieId));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [movieId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { page, loading: page === null && error === null, error, refreshing, refresh, reload: load };
}
