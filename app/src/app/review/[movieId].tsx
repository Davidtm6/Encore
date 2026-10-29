import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useReview } from '@/hooks/use-review';
import { useTheme } from '@/hooks/use-theme';
import { REVIEW_MAX_LENGTH } from '@/services/review-service';

export default function ReviewScreen() {
  const theme = useTheme();
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const review = useReview(Number(movieId));
  const length = review.body.trim().length;

  async function save() {
    if (await review.save()) {
      router.back();
    }
  }

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: review.exists ? 'Edit review' : 'Write review' }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {review.movie && <MovieCard movie={review.movie} />}
          {review.error && (
            <ErrorBanner message={review.error} onRetry={review.loaded ? undefined : review.reload} />
          )}
          {!review.loaded && !review.error && <ActivityIndicator accessibilityLabel="Loading your review" />}
          {review.loaded && (
            <>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                multiline
                textAlignVertical="top"
                placeholder="What did you think?"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel={`Review of ${review.movie?.title ?? 'this movie'}`}
                autoFocus={!review.exists}
                value={review.body}
                onChangeText={review.setBody}
              />
              <ThemedText
                type="small"
                themeColor={length > REVIEW_MAX_LENGTH ? 'danger' : 'textSecondary'}
                style={styles.count}>
                {length.toLocaleString()} / {REVIEW_MAX_LENGTH.toLocaleString()}
              </ThemedText>
              <Button label="Save review" onPress={save} busy={review.saving} />
              <Button label="Cancel" variant="plain" onPress={() => router.back()} disabled={review.saving} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    minHeight: 180,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
  },
  count: {
    textAlign: 'right',
  },
});
