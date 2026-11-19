import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { messageOf } from '@/services/errors';
import { lookUpDirectors } from '@/services/movie-service';
import { listMyMovies, type WatchedMovie } from '@/services/watched-service';

/** Most directors asked for per load; the function caps a call at 20 anyway. */
const DIRECTOR_BATCH = 20;

/** The watched list, reloaded whenever the screen comes into focus. */
export function useMyMovies() {
  const [movies, setMovies] = useState<WatchedMovie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Films whose director was already asked for while this screen was mounted,
  // so a film TMDB has no director for isn't looked up on every focus.
  const askedDirector = useRef(new Set<number>());

  /**
   * Fills in directors that haven't been looked up yet (#61), such as a film
   * just marked watched. Best effort: the list is already on screen, and a
   * failure only means the director shows up on a later visit.
   */
  const fillDirectors = useCallback(async (list: WatchedMovie[]) => {
    const ids = list
      .filter(({ movie }) => movie.director === null && !askedDirector.current.has(movie.id))
      .map(({ movie }) => movie.id)
      .slice(0, DIRECTOR_BATCH);
    if (ids.length === 0) {
      return;
    }
    ids.forEach((id) => askedDirector.current.add(id));
    try {
      const directors = await lookUpDirectors(ids);
      setMovies((current) =>
        current?.map((item) => {
          const director = directors.get(item.movie.id);
          return director ? { ...item, movie: { ...item.movie, director } } : item;
        }) ?? null,
      );
    } catch {
      ids.forEach((id) => askedDirector.current.delete(id));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await listMyMovies();
      setMovies(list);
      setError(null);
      fillDirectors(list);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [fillDirectors]);

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
