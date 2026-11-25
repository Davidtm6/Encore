import type { Tier } from '@/ranking/score';
import { userError } from '@/services/errors';
import { supabase } from '@/services/supabase';

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
