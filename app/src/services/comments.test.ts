import {
  canChange,
  COMMENT_MAX_LENGTH,
  commentsLabel,
  countByReview,
  validateComment,
  wasEdited,
} from '@/services/comments';

describe('validateComment', () => {
  it('accepts text within the limit', () => {
    expect(validateComment('  Agreed!  ')).toBeNull();
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH))).toBeNull();
  });

  it('rejects an empty or blank comment', () => {
    expect(validateComment('')).toMatch(/Write something/);
    expect(validateComment('  \n ')).toMatch(/Write something/);
  });

  it('rejects a comment over the limit, counting trimmed text', () => {
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1))).toMatch(/2,000/);
    expect(validateComment(` ${'x'.repeat(COMMENT_MAX_LENGTH)} `)).toBeNull();
  });
});

describe('canChange', () => {
  it('is true only for the comment’s author', () => {
    expect(canChange({ authorId: 'me' }, 'me')).toBe(true);
    expect(canChange({ authorId: 'them' }, 'me')).toBe(false);
    expect(canChange({ authorId: 'me' }, undefined)).toBe(false);
  });
});

describe('wasEdited', () => {
  it('ignores the moment of posting and notices a later edit', () => {
    const createdAt = '2026-11-20T10:00:00Z';
    expect(wasEdited({ createdAt, updatedAt: createdAt })).toBe(false);
    expect(wasEdited({ createdAt, updatedAt: '2026-11-20T10:00:30Z' })).toBe(false);
    expect(wasEdited({ createdAt, updatedAt: '2026-11-20T11:00:00Z' })).toBe(true);
  });
});

describe('countByReview', () => {
  it('counts comments per review author', () => {
    const counts = countByReview([{ review_user_id: 'a' }, { review_user_id: 'b' }, { review_user_id: 'a' }]);
    expect(Object.fromEntries(counts)).toEqual({ a: 2, b: 1 });
  });
});

describe('commentsLabel', () => {
  it('invites a first comment, then counts them', () => {
    expect(commentsLabel(0)).toBe('Comment');
    expect(commentsLabel(1)).toBe('1 comment');
    expect(commentsLabel(12)).toBe('12 comments');
  });
});
