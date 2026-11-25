import { groupConnections, relationTo, usernamePattern, type Follow } from '@/services/friends';

const me = { id: 'me', username: 'lucas' };
const alice = { id: 'a', username: 'alice' };
const bob = { id: 'b', username: 'Bob' };
const carol = { id: 'c', username: 'carol' };
const dan = { id: 'd', username: 'dan' };

describe('groupConnections', () => {
  const follows: Follow[] = [
    { follower: me, followee: bob },
    { follower: bob, followee: me },
    { follower: me, followee: alice },
    { follower: alice, followee: me },
    { follower: carol, followee: me },
    { follower: me, followee: dan },
  ];

  it('counts people as friends only when both added each other, sorted by username ignoring case', () => {
    expect(groupConnections('me', follows).friends).toEqual([alice, bob]);
  });

  it('lists people who added you but you have not added back', () => {
    expect(groupConnections('me', follows).addedYou).toEqual([carol]);
  });

  it('lists people you added who have not added you back', () => {
    expect(groupConnections('me', follows).youAdded).toEqual([dan]);
  });

  it('is empty with no follows', () => {
    expect(groupConnections('me', [])).toEqual({ friends: [], addedYou: [], youAdded: [] });
  });

  it('ignores rows that do not involve you', () => {
    expect(groupConnections('me', [{ follower: alice, followee: bob }])).toEqual({
      friends: [],
      addedYou: [],
      youAdded: [],
    });
  });
});

describe('relationTo', () => {
  const connections = { friends: [alice], addedYou: [carol], youAdded: [dan] };

  it('names each relation', () => {
    expect(relationTo(connections, 'a')).toBe('friend');
    expect(relationTo(connections, 'c')).toBe('addedYou');
    expect(relationTo(connections, 'd')).toBe('youAdded');
    expect(relationTo(connections, 'b')).toBe('none');
  });
});

describe('usernamePattern', () => {
  it('matches usernames containing the query', () => {
    expect(usernamePattern('ali')).toBe('%ali%');
  });

  it('escapes underscores so they are not wildcards', () => {
    expect(usernamePattern('film_fan')).toBe('%film\\_fan%');
  });

  it('drops characters a username cannot have, including LIKE wildcards', () => {
    expect(usernamePattern(' a%l.i ')).toBe('%ali%');
  });

  it('returns null when nothing is left to search for', () => {
    expect(usernamePattern('')).toBeNull();
    expect(usernamePattern('  %. ')).toBeNull();
  });
});
