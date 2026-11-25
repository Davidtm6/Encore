import { placeAtTierEnd } from '@/ranking/quick-place';
import type { Tier } from '@/ranking/score';
import { userError } from '@/services/errors';
import { supabase } from '@/services/supabase';
import { listMyMovies } from '@/services/watched-service';

/** The saved list changed after it was loaded, for example in another session. */
export class RankingConflictError extends Error {}

/**
 * Saves the whole ranking, best first, with each movie's tier in the same
 * order, in one transaction. It either fully saves or changes nothing; see
 * save_ranking in supabase/migrations.
 */
export async function saveRanking(order: number[], tiers: Tier[]): Promise<void> {
  const { error } = await supabase.rpc('save_ranking', { p_order: order, p_tiers: tiers });
  if (!error) {
    return;
  }
  if (error.code === '40001') {
    throw new RankingConflictError(error.message);
  }
  if (error.code === '22023') {
    throw new Error(error.message);
  }
  throw userError(error, 'Your ranking couldn’t be saved. Try again.');
}

/**
 * Files a movie under a tier without comparisons (#79): it goes to the bottom
 * of that tier in the saved list, and a re-rank can place it exactly later.
 * Returns its new position. The list is read fresh, and read again once if it
 * changed before the save.
 */
export async function fileUnderTier(movieId: number, tier: Tier): Promise<number> {
  for (let attempt = 1; ; attempt++) {
    const ranked = (await listMyMovies()).flatMap((m) => (m.tier ? [{ id: m.movie.id, tier: m.tier }] : []));
    const { order, tiers, position } = placeAtTierEnd(ranked, movieId, tier);
    try {
      await saveRanking(order, tiers);
      return position;
    } catch (e) {
      if (!(e instanceof RankingConflictError) || attempt >= 2) {
        throw e instanceof RankingConflictError ? new Error('Your list changed in another session. Try again.') : e;
      }
    }
  }
}
