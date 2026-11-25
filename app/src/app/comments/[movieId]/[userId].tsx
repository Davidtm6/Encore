import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useComments } from '@/hooks/use-comments';
import { useTheme } from '@/hooks/use-theme';
import { canChange, type Comment, COMMENT_MAX_LENGTH, wasEdited } from '@/services/comments';

/** The comments on one review (#41): the review, its thread oldest first, and a box to add to it. */
export default function CommentsScreen() {
  const theme = useTheme();
  const { movieId, userId } = useLocalSearchParams<{ movieId: string; userId: string }>();
  const thread = useComments(userId, Number(movieId));
  const length = thread.draft.trim().length;
  const reviewer = thread.review?.authorName ?? 'this review';

  async function remove(comment: Comment) {
    if (await confirmAction('Delete comment?', 'This can’t be undone.', 'Delete')) {
      await thread.remove(comment);
    }
  }

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: 'Comments' }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* iOS 26 draws this pushed screen under its glass header; "automatic" insets the content below it. */}
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {thread.loading && <ActivityIndicator style={styles.loading} accessibilityLabel="Loading comments" />}
          {thread.review && (
            <>
              <MovieCard movie={thread.review.movie} />
              <View style={styles.review}>
                <ThemedText type="smallBold">{thread.review.authorName}’s review</ThemedText>
                <ThemedText style={styles.italic}>“{thread.review.body}”</ThemedText>
              </View>

              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.sectionTitle}
                accessibilityRole="header">
                Comments ({thread.comments.length})
              </ThemedText>
              {thread.comments.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  No comments yet. Start the conversation.
                </ThemedText>
              )}
              {thread.comments.map((comment, i) => (
                <View key={comment.id}>
                  {i > 0 && <ListSeparator />}
                  <CommentRow
                    comment={comment}
                    mine={canChange(comment, thread.myId)}
                    onEdit={() => thread.startEditing(comment)}
                    onDelete={() => remove(comment)}
                  />
                </View>
              ))}
            </>
          )}
          {thread.error && (
            <ErrorBanner message={thread.error} onRetry={thread.review ? undefined : thread.reload} />
          )}
          {thread.review && (
            <View style={styles.composer}>
              {thread.editing && (
                <ThemedText type="small" themeColor="textSecondary">
                  Editing your comment
                </ThemedText>
              )}
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                multiline
                textAlignVertical="top"
                placeholder="Add a comment"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel={thread.editing ? 'Edit your comment' : `Comment on ${reviewer}’s review`}
                value={thread.draft}
                onChangeText={thread.setDraft}
              />
              <ThemedText
                type="small"
                themeColor={length > COMMENT_MAX_LENGTH ? 'danger' : 'textSecondary'}
                style={styles.count}>
                {length.toLocaleString()} / {COMMENT_MAX_LENGTH.toLocaleString()}
              </ThemedText>
              <View style={styles.actions}>
                {thread.editing && (
                  <Button label="Cancel" variant="plain" onPress={thread.cancelEditing} disabled={thread.saving} />
                )}
                <Button
                  label={thread.editing ? 'Save' : 'Post'}
                  accessibilityLabel={thread.editing ? 'Save your comment' : 'Post comment'}
                  onPress={thread.submit}
                  busy={thread.saving}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

type CommentRowProps = {
  comment: Comment;
  /** Your own comment, which you can edit or delete. */
  mine: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function CommentRow({ comment, mine, onEdit, onDelete }: CommentRowProps) {
  const date = new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const edited = wasEdited(comment);

  return (
    <View style={styles.comment}>
      <View
        accessible
        accessibilityLabel={`${mine ? 'You' : comment.authorName}, ${date}${edited ? ', edited' : ''}: ${comment.body}`}
        style={styles.commentText}>
        <View style={styles.commentHeader}>
          <ThemedText type="smallBold">{mine ? 'You' : comment.authorName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date}
            {edited ? ' · edited' : ''}
          </ThemedText>
        </View>
        <ThemedText>{comment.body}</ThemedText>
      </View>
      {mine && (
        <View style={styles.actions}>
          <Button size="small" variant="plain" label="Edit" accessibilityLabel="Edit your comment" onPress={onEdit} />
          <Button
            size="small"
            variant="plain"
            label="Delete"
            accessibilityLabel="Delete your comment"
            onPress={onDelete}
          />
        </View>
      )}
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
  review: {
    gap: Spacing.one,
  },
  italic: {
    fontStyle: 'italic',
  },
  sectionTitle: {
    paddingTop: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  comment: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  commentText: {
    gap: Spacing.one,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  composer: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  input: {
    minHeight: 96,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
  },
  count: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
