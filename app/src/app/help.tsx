import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const GUIDE_URL = 'https://github.com/Davidtm6/Encore/blob/main/docs/user-guide.md';
const ISSUES_URL = 'https://github.com/Davidtm6/Encore/issues';

interface Topic {
  question: string;
  answer: string;
}

/** How to use Encore. Wording matches the buttons on each screen. */
const TIPS: readonly Topic[] = [
  {
    question: 'How do I add a movie?',
    answer:
      'Open Search, type a title (or browse Popular right now), and press Mark watched. Undo takes it back off your list.',
  },
  {
    question: 'How does ranking work?',
    answer:
      'Press Rank and say whether you loved it, thought it was okay, or didn’t like it. Your first movie goes straight to #1. After that, Encore asks which of two movies you enjoyed more, using only movies you felt the same about, until the new one finds its place. That usually takes a handful of questions. Press Save to keep it. Each ranked movie gets a score from 0.0 to 10.0 based on its tier and place.',
  },
  {
    question: 'What if two movies are too close to call?',
    answer:
      'Press Too close to call? Skip and Encore asks about a different movie instead. Undo goes back one answer, and Start over begins again.',
  },
  {
    question: 'How do I change a ranking, review, or remove a movie?',
    answer:
      'Tap the movie in My List to open its page. From there press Re-rank, Review (or Edit review), or Remove from your list.',
  },
  {
    question: 'Who sees my reviews?',
    answer:
      'Under Who can read this, pick Friends (only you and your friends) or Everyone (anyone signed in to Encore). A friend is someone you added who added you back. Anyone who can read a review can comment on it.',
  },
];

/** What the app's error messages mean (#20). */
const ERRORS: readonly Topic[] = [
  {
    question: '“Can’t reach Encore. Check your connection and try again.”',
    answer:
      'Your phone is offline or the connection dropped. Nothing was lost; reconnect and press Retry.',
  },
  {
    question: 'Search says live search isn’t available',
    answer:
      'When the movie database can’t be reached, Search shows only movies already saved in Encore, without plot summaries. Try again in a minute for full results. Search also suggests a spelling under Did you mean when nothing matches.',
  },
  {
    question: 'I made an account but can’t sign in',
    answer:
      'Check your email for the confirmation link we sent and open it, then sign in. Look in your spam folder if it isn’t there.',
  },
  {
    question: 'I forgot my password',
    answer:
      'On the sign-in screen press Forgot password?, enter your email, and press Send code. Type the code from the email and your new password. Send a new code if it expired.',
  },
  {
    question: '“Your list changed in another session, so this ranking started over.”',
    answer:
      'Your list was changed on another device or tab while you were ranking, so Encore started this ranking again to avoid saving an out-of-date order. Answer the questions again and press Save.',
  },
  {
    question: '“Your session expired. Sign out and sign back in.”',
    answer: 'You’ve been signed in for a long time. Sign out from My List, then sign back in.',
  },
];

/** In-app help: tips and an FAQ for common errors, linked from About and an empty My List (#20). */
export default function HelpScreen() {
  return (
    <ThemedView style={styles.fill}>
      {/* iOS 26 draws content under the glass header; "automatic" insets it below (#74). */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Section title="Using Encore" topics={TIPS} />
        <Section title="Common problems" topics={ERRORS} />

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
          More help
        </ThemedText>
        <Button
          label="Read the full user guide"
          variant="secondary"
          accessibilityHint="Opens the guide in your browser"
          onPress={() => Linking.openURL(GUIDE_URL)}
        />
        <Button
          label="Report a bug"
          variant="plain"
          accessibilityHint="Opens Encore’s GitHub issues in your browser"
          onPress={() => Linking.openURL(ISSUES_URL)}
        />
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, topics }: { title: string; topics: readonly Topic[] }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </ThemedText>
      {topics.map((topic) => (
        // One stop per question for VoiceOver and TalkBack, reading the question then the answer.
        <View key={topic.question} style={styles.topic} accessible accessibilityLabel={`${topic.question} ${topic.answer}`}>
          <ThemedText type="smallBold">{topic.question}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {topic.answer}
          </ThemedText>
        </View>
      ))}
    </View>
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
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    paddingTop: Spacing.three,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  topic: {
    gap: Spacing.one,
  },
});
