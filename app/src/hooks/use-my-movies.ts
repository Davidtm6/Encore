import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { messageOf } from '@/services/errors';
import { listMyMovies, type WatchedMovie } from '@/services/watched-service';

/** The watched list, reloaded whenever the screen comes into focus. */
export function useMyMovies() {
  const [movies, setMovies] = useState<WatchedMovie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setMovies(await listMyMovies());
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, []);

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

  return {
    ranked: movies?.filter((m) => m.rankPosition !== null) ?? [],
    unranked: movies?.filter((m) => m.rankPosition === null) ?? [],
    watchedIds: new Set(movies?.map((m) => m.movie.id)),
    loading: movies === null && error === null,
    error,
    refreshing,
    refresh,
    reload: load,
  };
}
