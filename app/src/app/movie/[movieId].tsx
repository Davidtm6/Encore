import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useMoviePage } from '@/hooks/use-movie-page';
import { useTheme } from '@/hooks/use-theme';
import { commentsLabel } from '@/services/comments';
import { placementLabel, spokenPlacement, type Take } from '@/services/movie-page';

/**
 * A movie's page (#40): your rank and review, then your friends' ranks and
 * reviews, then other people's public reviews.
 */
export default function MovieScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { page, loading, error, refreshing, refresh, reload } = useMoviePage(Number(movieId));
  const params = { movieId: String(movieId) };
  const countFor = (take: Take) => page?.commentCounts.get(take.userId) ?? 0;

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: page?.movie.title ?? 'Movie' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading && <ActivityIndicator style={styles.loading} accessibilityLabel="Loading this movie" />}
        {page && (
          <>
            <MovieCard movie={page.movie} rank={page.mine?.placement?.position} />

            <Section title="Your take">
              {page.mine ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {page.mine.placement
                      ? `${placementLabel(page.mine.placement)} on your list`
                      : 'On your list, not ranked yet'}
                  </ThemedText>
                  {page.mine.review ? (
                    <ReviewText take={page.mine} showVisibility commentCount={countFor(page.mine)} />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      You haven’t reviewed it.
                    </ThemedText>
                  )}
                  <View style={styles.actions}>
                    <Button
                      size="small"
                      variant="secondary"
                      label={page.mine.review ? 'Edit review' : 'Review'}
                      onPress={() => router.push({ pathname: '/review/[movieId]', params })}
                    />
                    <Button
                      size="small"
                      variant={page.mine.placement ? 'secondary' : 'primary'}
                      label={page.mine.placement ? 'Re-rank' : 'Rank'}
                      accessibilityLabel={`${page.mine.placement ? 'Re-rank' : 'Rank'} ${page.movie.title}`}
                      onPress={() => router.push({ pathname: '/rank/[movieId]', params })}
                    />
                  </View>
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Not on your list. Find it on the Search tab to mark it watched.
                </ThemedText>
              )}
            </Section>

            <Section title={`Friends (${page.friends.length})`}>
              {page.friends.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  None of your friends have this on their list yet.
                </ThemedText>
              ) : (
                page.friends.map((take, i) => (
                  <View key={take.userId}>
                    {i > 0 && <ListSeparator />}
                    <TakeRow take={take} commentCount={countFor(take)} />
                  </View>
                ))
              )}
            </Section>

            {page.others.length > 0 && (
              <Section title={`Public reviews (${page.others.length})`}>
                {page.others.map((take, i) => (
                  <View key={take.userId}>
                    {i > 0 && <ListSeparator />}
                    <TakeRow take={take} commentCount={countFor(take)} />
                  </View>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * Someone else's take: their name (opens their page), where they ranked it if
 * they're a friend, and their review with its comments.
 */
function TakeRow({ take, commentCount }: { take: Take; commentCount: number }) {
  const theme = useTheme();
  const spoken = [take.username, take.placement ? spokenPlacement(take.placement) : null].filter(Boolean).join(', ');

  return (
    <View style={styles.take}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={`Opens ${take.username}’s page`}
        onPress={() => router.push({ pathname: '/friend/[userId]', params: { userId: take.userId } })}
        style={({ pressed }) => [styles.takeHeader, { opacity: pressed ? 0.7 : 1 }]}>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          {take.username}
        </ThemedText>
        {take.placement && (
          <ThemedText type="small" themeColor="textSecondary">
            {placementLabel(take.placement)}
          </ThemedText>
        )}
      </Pressable>
      {take.review ? (
        <ReviewText take={take} commentCount={commentCount} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {take.placement ? 'Ranked it, no review.' : 'Watched it, no review yet.'}
        </ThemedText>
      )}
    </View>
  );
}

type ReviewTextProps = {
  take: Take;
  commentCount: number;
  /** Says who can read it; shown on your own review. */
  showVisibility?: boolean;
};

/** A review, with a button that opens its comments (#41). */
function ReviewText({ take, commentCount, showVisibility = false }: ReviewTextProps) {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  if (!take.review) {
    return null;
  }
  return (
    <View style={styles.review}>
      <ThemedText style={styles.reviewBody} accessibilityLabel={`${take.username}’s review: ${take.review.body}`}>
        “{take.review.body}”
      </ThemedText>
      {showVisibility && (
        <ThemedText type="small" themeColor="textSecondary">
          {take.review.visibility === 'public' ? 'Everyone can read this.' : 'Only your friends can read this.'}
        </ThemedText>
      )}
      <View style={styles.commentsButton}>
        <Button
          size="small"
          variant="plain"
          label={commentsLabel(commentCount)}
          accessibilityLabel={`${commentsLabel(commentCount)} on ${take.username}’s review`}
          onPress={() =>
            router.push({ pathname: '/comments/[movieId]/[userId]', params: { movieId, userId: take.userId } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    paddingTop: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  take: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  takeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  review: {
    gap: Spacing.one,
  },
  reviewBody: {
    fontStyle: 'italic',
  },
  commentsButton: {
    alignItems: 'flex-start',
    marginLeft: -Spacing.three,
  },
});
