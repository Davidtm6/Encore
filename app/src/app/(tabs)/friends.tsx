import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFriends } from '@/hooks/use-friends';
import { useTheme } from '@/hooks/use-theme';
import { messageOf } from '@/services/errors';
import type { Person } from '@/services/friends';

function openProfile(person: Person) {
  router.push({ pathname: '/friend/[userId]', params: { userId: person.id } });
}

export default function FriendsScreen() {
  const theme = useTheme();
  const friends = useFriends();
  const { query, setQuery, people, searching, searchError, searchedQuery, busyId } = friends;
  const searchingPeople = query.trim() !== '';

  async function run(action: () => Promise<void>, failure: string) {
    try {
      await action();
    } catch (e) {
      Alert.alert(failure, messageOf(e));
    }
  }

  async function remove(person: Person) {
    if (
      await confirmAction(
        `Remove ${person.username}?`,
        'You’ll stop seeing each other’s rankings. Either of you can add the other again.',
        'Remove',
      )
    ) {
      await run(() => friends.remove(person), 'Couldn’t remove the friend');
    }
  }

  /** The buttons for a person, which depend on how you're connected. */
  function actionsFor(person: Person) {
    const busy = busyId === person.id;
    const disabled = busyId !== null;
    switch (friends.relationOf(person.id)) {
      case 'friend':
        return (
          <>
            <Button
              size="small"
              variant="plain"
              label="Remove"
              accessibilityLabel={`Remove ${person.username} as a friend`}
              disabled={disabled}
              onPress={() => remove(person)}
            />
            <Button
              size="small"
              variant="secondary"
              label="View"
              accessibilityLabel={`View ${person.username}’s rankings`}
              onPress={() => openProfile(person)}
            />
          </>
        );
      case 'addedYou':
        return (
          <>
            <Button
              size="small"
              variant="plain"
              label="Dismiss"
              accessibilityLabel={`Dismiss ${person.username}’s add`}
              disabled={disabled}
              onPress={() => run(() => friends.remove(person), 'Couldn’t dismiss')}
            />
            <Button
              size="small"
              label="Add back"
              accessibilityLabel={`Add ${person.username} back`}
              busy={busy}
              disabled={disabled}
              onPress={() => run(() => friends.add(person), 'Couldn’t add them')}
            />
          </>
        );
      case 'youAdded':
        return (
          <Button
            size="small"
            variant="plain"
            label="Cancel"
            accessibilityLabel={`Cancel your add of ${person.username}`}
            busy={busy}
            disabled={disabled}
            onPress={() => run(() => friends.remove(person), 'Couldn’t cancel')}
          />
        );
      default:
        return (
          <Button
            size="small"
            label="Add"
            accessibilityLabel={`Add ${person.username} as a friend`}
            busy={busy}
            disabled={disabled}
            onPress={() => run(() => friends.add(person), 'Couldn’t add them')}
          />
        );
    }
  }

  const statusOf = (person: Person) =>
    ({
      friend: 'Friend',
      addedYou: 'Added you',
      youAdded: 'Waiting for them to add you back',
      none: undefined,
    })[friends.relationOf(person.id)];

  const sections = searchingPeople
    ? [{ title: 'People', data: people }]
    : [
        { title: `Added you (${friends.addedYou.length})`, data: friends.addedYou },
        { title: `Friends (${friends.friends.length})`, data: friends.friends },
        { title: `Waiting for them to add you back (${friends.youAdded.length})`, data: friends.youAdded },
      ].filter((section) => section.data.length > 0);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          Friends
        </ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Find people by username"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Find people by username"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
        />
        {friends.error && !searchingPeople && <ErrorBanner message={friends.error} onRetry={friends.reload} />}
        {searchError && searchingPeople && <ErrorBanner message={searchError} />}
        {friends.loading && !searchingPeople ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel="Loading your friends" />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(person) => person.id}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => (
              <PersonRow
                person={item}
                status={searchingPeople ? statusOf(item) : undefined}
                onOpen={friends.relationOf(item.id) === 'friend' ? () => openProfile(item) : undefined}>
                {actionsFor(item)}
              </PersonRow>
            )}
            ItemSeparatorComponent={ListSeparator}
            ListHeaderComponent={
              searching ? (
                <View style={styles.searching} accessibilityLiveRegion="polite">
                  <ActivityIndicator />
                  <ThemedText type="small" themeColor="textSecondary">
                    Searching for “{query.trim()}”…
                  </ThemedText>
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              searchingPeople ? (
                searching || searchError ? undefined : (
                  <ThemedText themeColor="textSecondary" style={styles.empty}>
                    No one’s username contains “{searchedQuery}”.
                  </ThemedText>
                )
              ) : friends.error ? undefined : (
                <View style={styles.empty}>
                  <ThemedText>No friends yet.</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Search for someone’s username above and add them. Once they add you back, you can see each
                    other’s rankings and reviews.
                  </ThemedText>
                </View>
              )
            }
            refreshing={friends.refreshing}
            onRefresh={searchingPeople ? undefined : friends.refresh}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type PersonRowProps = {
  person: Person;
  status?: string;
  /** Opens the profile when the name is tapped; only friends have one to show. */
  onOpen?: () => void;
  children: ReactNode;
};

function PersonRow({ person, status, onOpen, children }: PersonRowProps) {
  const theme = useTheme();
  const name = (
    <View style={styles.person}>
      <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="smallBold" themeColor="accentText">
          {person.username.slice(0, 1).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.personText}>
        <ThemedText type="smallBold" style={styles.username} numberOfLines={1}>
          {person.username}
        </ThemedText>
        {status ? (
          <ThemedText type="small" themeColor="textSecondary">
            {status}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.row}>
      {onOpen ? (
        <Pressable
          style={styles.personPressable}
          accessibilityRole="button"
          accessibilityLabel={`${person.username}${status ? `, ${status}` : ''}`}
          accessibilityHint="Opens their rankings and reviews"
          onPress={onOpen}>
          {name}
        </Pressable>
      ) : (
        <View
          style={styles.personPressable}
          accessible
          accessibilityLabel={`${person.username}${status ? `, ${status}` : ''}`}>
          {name}
        </View>
      )}
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    paddingTop: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  loading: {
    marginTop: Spacing.five,
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  personPressable: {
    flex: 1,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personText: {
    flex: 1,
    gap: Spacing.half,
  },
  username: {
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  empty: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  list: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
