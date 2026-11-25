import { currentUserId } from '@/services/auth-service';
import { userError } from '@/services/errors';
import { groupConnections, usernamePattern, type Connections, type Person } from '@/services/friends';
import { supabase } from '@/services/supabase';
import { listWatched, type WatchedMovie } from '@/services/watched-service';

/** Most people a username search returns. */
const MAX_PEOPLE = 20;

/** The signed-in user's friends and one-way adds. RLS returns only follows rows that involve them. */
export async function listConnections(): Promise<Connections> {
  const myId = await currentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select(
      'follower:profiles!follows_follower_id_fkey(id, username), followee:profiles!follows_followee_id_fkey(id, username)',
    );
  if (error) {
    throw userError(error, 'Your friends couldn’t be loaded. Try again.');
  }
  return groupConnections(myId, data);
}

/** Other people whose usernames contain the query, by username. */
export async function searchPeople(query: string): Promise<Person[]> {
  const pattern = usernamePattern(query);
  if (!pattern) {
    return [];
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', pattern)
    .neq('id', await currentUserId())
    .order('username')
    .limit(MAX_PEOPLE);
  if (error) {
    throw userError(error, 'People couldn’t be searched. Try again.');
  }
  return data;
}

/** Adds someone. You're friends once they've added you too. Adding someone twice is not an error. */
export async function addFriend(personId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ followee_id: personId });
  if (error && error.code !== '23505') {
    throw userError(error, 'That person couldn’t be added. Try again.');
  }
}

/**
 * Removes a friend, cancels your add, or dismisses theirs: deletes the adds in
 * both directions, so neither of you sees the other's ranking afterwards.
 */
export async function removeFriend(personId: string): Promise<void> {
  const myId = await currentUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .or(
      `and(follower_id.eq.${myId},followee_id.eq.${personId}),and(follower_id.eq.${personId},followee_id.eq.${myId})`,
    );
  if (error) {
    throw userError(error, 'That couldn’t be removed. Try again.');
  }
}

export interface FriendProfile {
  person: Person;
  /** Empty unless you're friends: RLS hides everyone else's lists. */
  movies: WatchedMovie[];
}

/** Someone's username and, when you're friends, their watched list with rankings and reviews. */
export async function getFriendProfile(personId: string): Promise<FriendProfile> {
  const { data, error } = await supabase.from('profiles').select('id, username').eq('id', personId).maybeSingle();
  if (error) {
    throw userError(error, 'This profile couldn’t be loaded. Try again.');
  }
  if (!data) {
    throw new Error('This account no longer exists.');
  }
  const movies = await listWatched(personId, `${data.username}’s list couldn’t be loaded. Try again.`);
  return { person: data, movies };
}
