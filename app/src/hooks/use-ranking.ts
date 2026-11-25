import { useEffect, useState } from 'react';

import {
  choose,
  comparisonsLeft,
  finalOrder,
  isDone,
  neighbors,
  nextOpponent,
  placeRange,
  progressFraction,
  skip,
  startRanking,
  tierBounds,
  type RankingSession,
} from '@/ranking/ranking-session';
import { scoresForList, type Tier } from '@/ranking/score';
import { messageOf } from '@/services/errors';
import type { Movie } from '@/services/movie-service';
import { RankingConflictError, saveRanking } from '@/services/ranking-api';
import { listMyMovies } from '@/services/watched-service';

type RankedItem = { id: number; tier: Tier };

/**
 * Drives one Rank or Re-rank of `movieId` against the saved list: first the
 * tier (Loved it, It was okay, Didn't like it), then comparisons with movies
 * in that tier only, any of which can be skipped as too close to call.
 */
export function useRanking(movieId: number) {
  const [movies, setMovies] = useState<Map<number, Movie>>(new Map());
  const [ranked, setRanked] = useState<RankedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Null until the person picks a tier; the comparisons start after that.
  const [tier, setTier] = useState<Tier | null>(null);
  // The current session plus every earlier one, so Undo can take back an answer
  // or a skip. Sessions are immutable, so keeping them is all undo needs.
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
        setMovies(new Map(list.map((m) => [m.movie.id, m.movie])));
        setRanked(list.flatMap((m) => (m.tier === null ? [] : [{ id: m.movie.id, tier: m.tier }])));
        setTier(null);
        setSteps([]);
        setLoaded(true);
        setLoadError(null);
      },
      (e) => current && setLoadError(messageOf(e)),
    );
    return () => {
      current = false;
    };
  }, [movieId, attempt]);

  /** Starts the comparisons within `chosen`'s part of the list. */
  function chooseTier(chosen: Tier) {
    setSaveError(null);
    setTier(chosen);
    setSteps([startRanking(ranked.map((m) => m.id), movieId, tierBounds(ranked, movieId, chosen))]);
  }

  /** Back to the tier question, with no answers. */
  function restart() {
    setSaveError(null);
    setTier(null);
    setSteps([]);
  }

  const opponentId = session ? nextOpponent(session) : undefined;
  const done = session !== null && isDone(session);
  const left = session ? comparisonsLeft(session) : 0;
  const previousIndex = ranked.findIndex((m) => m.id === movieId);
  // Comparisons answered plus skips, since both move the ranking on.
  const answered = Math.max(steps.length - 1, 0);
  const around = session && done ? neighbors(session) : {};
  const position = session && done ? session.low + 1 : null;

  /** The finished list best first, with this movie in its new place and tier. */
  function result(): RankedItem[] {
    if (!session || !done || tier === null) {
      return [];
    }
    const tiers = new Map(ranked.map((m) => [m.id, m.tier]));
    return finalOrder(session).map((id) => ({ id, tier: id === movieId ? tier : tiers.get(id)! }));
  }
  const score = done ? (scoresForList(result()).get(movieId) ?? null) : null;

  /** Saves the result. Returns true when the screen can close. */
  async function save(): Promise<boolean> {
    const list = result();
    if (list.length === 0) {
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveRanking(
        list.map((m) => m.id),
        list.map((m) => m.tier),
      );
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
    ready: loaded,
    /** The tier picked for this ranking, or null while the tier question is showing. */
    tier,
    /** The movie's tier before this ranking, for re-ranks; null for a first ranking. */
    previousTier: previousIndex === -1 ? null : ranked[previousIndex].tier,
    chooseTier,
    done,
    /** Best and worst places the movie can still land, counting from 1, and the list's length. */
    range: session ? placeRange(session) : null,
    position,
    /** The movie's 0.0–10.0 score in its new place, once the place is known. */
    score,
    previousPosition: previousIndex === -1 ? null : previousIndex + 1,
    total: session ? session.others.length + 1 : 0,
    /** How many comparisons have been answered or skipped, and the most still to come. */
    progress: { answered, left, fraction: progressFraction(answered, left) },
    /** The films directly above and below the new place, with their new positions. */
    above: around.above === undefined || position === null ? undefined : { movie: movies.get(around.above), rank: position - 1 },
    below: around.below === undefined || position === null ? undefined : { movie: movies.get(around.below), rank: position + 1 },
    choose: (preferNew: boolean) => {
      setSaveError(null);
      setSteps((s) => (s.length > 0 ? [...s, choose(s[s.length - 1], preferNew)] : s));
    },
    /** Skips the current comparison as too close to call and asks another movie (#43). */
    skip: () => {
      setSaveError(null);
      setSteps((s) => (s.length > 0 ? [...s, skip(s[s.length - 1])] : s));
    },
    /** Undoes the last answer or skip; from the first comparison, goes back to the tier question. */
    back: () => {
      if (steps.length > 1) {
        setSteps((s) => s.slice(0, -1));
      } else {
        restart();
      }
    },
    canGoBack: tier !== null,
    restart,
    save,
    saving,
    loadError,
    saveError,
    reload,
  };
}
