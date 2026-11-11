import { useEffect, useState } from 'react';

import {
  choose,
  comparisonsLeft,
  finalOrder,
  isDone,
  neighbors,
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
  // The current session plus every earlier one, so Undo can take back an answer.
  // Sessions are immutable, so keeping them is all undo needs.
  const [steps, setSteps] = useState<RankingSession<number>[]>([]);
  const session = steps.at(-1) ?? null;
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
        setSteps([startRanking(order, movieId)]);
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
  const answered = Math.max(steps.length - 1, 0);
  const around = session && done ? neighbors(session) : {};
  const position = session && done ? session.low + 1 : null;

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
    position,
    previousPosition: previousIndex === -1 ? null : previousIndex + 1,
    total: session ? session.others.length + 1 : 0,
    /** How many comparisons have been answered, and the most still to come. */
    progress: { answered, left: session ? comparisonsLeft(session) : 0 },
    /** The films directly above and below the new place, with their new positions. */
    above: around.above === undefined || position === null ? undefined : { movie: movies.get(around.above), rank: position - 1 },
    below: around.below === undefined || position === null ? undefined : { movie: movies.get(around.below), rank: position + 1 },
    choose: (preferNew: boolean) => {
      setSaveError(null);
      setSteps((s) => (s.length > 0 ? [...s, choose(s[s.length - 1], preferNew)] : s));
    },
    /** Undoes the last answer. */
    back: () => setSteps((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    canGoBack: answered > 0,
    restart: () => setSteps([startRanking(ranked, movieId)]),
    save,
    saving,
    loadError,
    saveError,
    reload,
  };
}
