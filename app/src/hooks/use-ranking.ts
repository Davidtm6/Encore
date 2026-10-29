import { useEffect, useState } from 'react';

import {
  choose,
  finalOrder,
  isDone,
  nextOpponent,
  startRanking,
  type RankingSession,
} from '@/ranking/ranking-session';
import { messageOf } from '@/services/errors';
import type { Movie } from '@/services/movie-service';
import { RankingConflictError, saveRanking } from '@/services/ranking-api';
import { listMyMovies } from '@/services/watched-service';

/** Drives one Rank or Re-rank of `movieId` against the saved list. */
export function useRanking(movieId: number) {
  const [movies, setMovies] = useState<Map<number, Movie>>(new Map());
  const [ranked, setRanked] = useState<number[]>([]);
  const [session, setSession] = useState<RankingSession<number> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let current = true;
    listMyMovies().then(
      (list) => {
        if (!current) {
          return;
        }
        if (!list.some((m) => m.movie.id === movieId)) {
          setLoadError('Mark this movie watched before ranking it.');
          return;
        }
        const order = list.filter((m) => m.rankPosition !== null).map((m) => m.movie.id);
        setMovies(new Map(list.map((m) => [m.movie.id, m.movie])));
        setRanked(order);
        setSession(startRanking(order, movieId));
        setLoadError(null);
      },
      (e) => current && setLoadError(messageOf(e)),
    );
    return () => {
      current = false;
    };
  }, [movieId, attempt]);

  const opponentId = session ? nextOpponent(session) : undefined;
  const done = session !== null && isDone(session);
  const previousIndex = ranked.indexOf(movieId);

  /** Saves the result. Returns true when the screen can close. */
  async function save(): Promise<boolean> {
    if (!session || !done) {
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveRanking(finalOrder(session));
      return true;
    } catch (e) {
      // Another session changed the list: start again from the saved order.
      if (e instanceof RankingConflictError) {
        setSaveError('Your list changed in another session, so this ranking started over.');
        reload();
      } else {
        setSaveError(messageOf(e));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    movie: movies.get(movieId),
    opponent: opponentId === undefined ? undefined : movies.get(opponentId),
    ready: session !== null,
    done,
    /** Best and worst places the movie can still land, counting from 1. */
    range: session ? { best: session.low + 1, worst: session.high + 1 } : null,
    position: session && done ? session.low + 1 : null,
    previousPosition: previousIndex === -1 ? null : previousIndex + 1,
    total: session ? session.others.length + 1 : 0,
    choose: (preferNew: boolean) => {
      setSaveError(null);
      setSession((s) => s && choose(s, preferNew));
    },
    restart: () => setSession(startRanking(ranked, movieId)),
    save,
    saving,
    loadError,
    saveError,
    reload,
  };
}
