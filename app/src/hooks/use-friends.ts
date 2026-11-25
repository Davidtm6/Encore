import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { messageOf } from '@/services/errors';
import { relationTo, type Connections, type Person, type Relation } from '@/services/friends';
import { addFriend, listConnections, removeFriend, searchPeople } from '@/services/friends-service';

// Wait for a short pause in typing before searching usernames.
const DEBOUNCE_MS = 300;

const NO_ONE: Connections = { friends: [], addedYou: [], youAdded: [] };

/** The Friends tab: your connections, reloaded on focus, and a username search. */
export function useFriends() {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The person whose add or remove is in progress.
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  // The last search's answer and the query it belongs to. It stays up while
  // the next search loads, so the list doesn't flash empty between keystrokes.
  const [found, setFound] = useState<{ query: string; people: Person[]; error: string | null }>({
    query: '',
    people: [],
    error: null,
  });
  const wanted = query.trim();
  const searching = wanted !== '' && found.query !== wanted;

  const load = useCallback(async () => {
    try {
      setConnections(await listConnections());
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

  useEffect(() => {
    if (!wanted) {
      return;
    }
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const people = await searchPeople(wanted);
        if (current) {
          setFound({ query: wanted, people, error: null });
        }
      } catch (e) {
        if (current) {
          setFound((last) => ({ ...last, query: wanted, error: messageOf(e) }));
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [wanted]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  /** Runs an add or remove, then reloads. Throws the user-facing error for the screen to show. */
  async function change(person: Person, action: (id: string) => Promise<void>) {
    setBusyId(person.id);
    try {
      await action(person.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const current = connections ?? NO_ONE;
  return {
    ...current,
    relationOf: (personId: string): Relation => relationTo(current, personId),
    loading: connections === null && error === null,
    error,
    refreshing,
    refresh,
    reload: load,
    busyId,
    add: (person: Person) => change(person, addFriend),
    remove: (person: Person) => change(person, removeFriend),
    query,
    setQuery,
    /** People whose usernames match the search; empty when the search box is. */
    people: wanted ? found.people : [],
    searching,
    searchError: wanted ? found.error : null,
    /** The search that `people` answers, which trails `query` while loading. */
    searchedQuery: found.query,
  };
}
