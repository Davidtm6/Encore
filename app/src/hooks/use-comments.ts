import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import {
  deleteComment,
  editComment,
  getThreadReview,
  listComments,
  postComment,
  type ThreadReview,
} from '@/services/comment-service';
import { type Comment, validateComment } from '@/services/comments';
import { messageOf } from '@/services/errors';

/** A review's comment thread: the review, its comments, and a box for writing or editing one. */
export function useComments(reviewUserId: string, movieId: number) {
  const { session } = useSession();
  const myId = session?.user.id;
  const [review, setReview] = useState<ThreadReview | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  /** The comment being edited, or null when the box writes a new one. */
  const [editing, setEditing] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [found, thread] = await Promise.all([
        getThreadReview(reviewUserId, movieId),
        listComments(reviewUserId, movieId),
      ]);
      setReview(found);
      setComments(thread);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [reviewUserId, movieId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Posts the draft, or saves the edit. On failure the text stays for a retry. */
  async function submit(): Promise<void> {
    const invalid = validateComment(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await editComment(editing.id, draft);
      } else {
        await postComment(reviewUserId, movieId, draft);
      }
      setDraft('');
      setEditing(null);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(comment: Comment) {
    setEditing(comment);
    setDraft(comment.body);
    setError(null);
  }

  function cancelEditing() {
    setEditing(null);
    setDraft('');
  }

  async function remove(comment: Comment): Promise<void> {
    setError(null);
    try {
      await deleteComment(comment.id);
      if (editing?.id === comment.id) {
        cancelEditing();
      }
      await load();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return {
    myId,
    review,
    comments,
    draft,
    setDraft,
    editing,
    startEditing,
    cancelEditing,
    submit,
    remove,
    saving,
    loading: review === null && error === null,
    error,
    reload: load,
  };
}
