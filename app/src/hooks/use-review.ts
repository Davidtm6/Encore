import { useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { messageOf } from '@/services/errors';
import { getMovie, type Movie } from '@/services/movie-service';
import { getMyReview, saveReview, validateReview } from '@/services/review-service';

/** Loads and saves the signed-in user's one review of `movieId`. */
export function useReview(movieId: number) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [body, setBody] = useState('');
  const [exists, setExists] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let current = true;
    Promise.all([getMovie(movieId), getMyReview(userId, movieId)]).then(
      ([found, review]) => {
        if (!current) {
          return;
        }
        setMovie(found);
        setBody(review ?? '');
        setExists(review !== null);
        setLoaded(true);
        setError(null);
      },
      (e) => current && setError(messageOf(e)),
    );
    return () => {
      current = false;
    };
  }, [movieId, userId, attempt]);

  /** Saves the review. Returns true when the screen can close; on failure the text stays. */
  async function save(): Promise<boolean> {
    const invalid = validateReview(body);
    if (invalid || !userId) {
      setError(invalid);
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await saveReview(userId, movieId, body);
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { movie, body, setBody, exists, loaded, error, saving, save, reload: () => setAttempt((n) => n + 1) };
}
