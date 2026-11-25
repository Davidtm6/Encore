import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { messageOf } from '@/services/errors';
import { relationTo, type Relation } from '@/services/friends';
import { getFriendProfile, listConnections, type FriendProfile } from '@/services/friends-service';

/** A friend's account page: their username, how you're connected, and their list. */
export function useFriendProfile(personId: string) {
  const [profile, setProfile] = useState<(FriendProfile & { relation: Relation }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [found, connections] = await Promise.all([getFriendProfile(personId), listConnections()]);
      setProfile({ ...found, relation: relationTo(connections, personId) });
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [personId]);

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
    person: profile?.person ?? null,
    relation: profile?.relation ?? 'none',
    ranked: profile?.movies.filter((m) => m.rankPosition !== null) ?? [],
    unranked: profile?.movies.filter((m) => m.rankPosition === null) ?? [],
    loading: profile === null && error === null,
    error,
    refreshing,
    refresh,
    reload: load,
  };
}
