/**
 * Friend logic with no Supabase or React Native imports, so Jest can test it.
 * Two people are friends once each has added the other (see the follows table
 * in supabase/migrations/20261124000000_friends.sql).
 */

export interface Person {
  id: string;
  username: string;
}

/** One row of the follows table with both profiles filled in. */
export interface Follow {
  follower: Person;
  followee: Person;
}

export interface Connections {
  /** Both added each other: you can see each other's rankings. */
  friends: Person[];
  /** They added you and you haven't added them back. */
  addedYou: Person[];
  /** You added them and they haven't added you back. */
  youAdded: Person[];
}

export type Relation = 'friend' | 'addedYou' | 'youAdded' | 'none';

/** Usernames are 3–30 letters, numbers, or underscores (see auth-validation.ts). */
const NOT_USERNAME = /[^A-Za-z0-9_]/g;

function byUsername(a: Person, b: Person): number {
  return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
}

/** Sorts the signed-in user's follows rows into friends and one-way adds, each by username. */
export function groupConnections(myId: string, follows: readonly Follow[]): Connections {
  const added = new Map<string, Person>();
  const addedMe = new Map<string, Person>();
  for (const { follower, followee } of follows) {
    if (follower.id === myId) {
      added.set(followee.id, followee);
    } else if (followee.id === myId) {
      addedMe.set(follower.id, follower);
    }
  }
  const friends = [...added.values()].filter((p) => addedMe.has(p.id));
  return {
    friends: friends.sort(byUsername),
    addedYou: [...addedMe.values()].filter((p) => !added.has(p.id)).sort(byUsername),
    youAdded: [...added.values()].filter((p) => !addedMe.has(p.id)).sort(byUsername),
  };
}

/** Where someone stands with the signed-in user. */
export function relationTo(connections: Connections, personId: string): Relation {
  const has = (people: Person[]) => people.some((p) => p.id === personId);
  if (has(connections.friends)) {
    return 'friend';
  }
  if (has(connections.addedYou)) {
    return 'addedYou';
  }
  return has(connections.youAdded) ? 'youAdded' : 'none';
}

/**
 * An ILIKE pattern that finds usernames containing the query, or null when the
 * query has nothing a username could contain. Characters a username can't have
 * are dropped, and `_` is escaped so it isn't a wildcard.
 */
export function usernamePattern(query: string): string | null {
  const cleaned = query.replace(NOT_USERNAME, '');
  return cleaned ? `%${cleaned.replace(/_/g, '\\_')}%` : null;
}
