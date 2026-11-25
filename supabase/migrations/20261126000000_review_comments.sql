-- Comments on reviews (#41). Anyone who can read a review can comment on it:
-- its author, their friends, and, for a public review, every signed-in user
-- (see reviews_read in the review visibility migration). Only a comment's
-- author can edit or delete it.
--
-- The read and write rules look the review up through public.reviews, whose
-- own RLS decides whether the caller may read it. So if a public review
-- becomes friends-only, its comments stay readable by whoever can still read
-- the review (its author and their friends). Someone who commented but can
-- no longer read the review can't add more, but still sees and can delete
-- their own comments.

create table public.review_comments (
  id bigint generated always as identity primary key,
  review_user_id uuid not null,
  movie_id bigint not null,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting the review (or its watched row) deletes its comments.
  foreign key (review_user_id, movie_id)
    references public.reviews(user_id, movie_id) on delete cascade
);

-- A review's thread, oldest first; also used to count a movie's comments.
create index review_comments_review on public.review_comments (movie_id, review_user_id, created_at);

-- Reuses the reviews trigger function, which only sets updated_at.
create trigger review_comment_updated_at before update on public.review_comments
for each row execute function public.set_review_updated_at();

alter table public.review_comments enable row level security;

revoke all on public.review_comments from anon, authenticated;
grant select, insert, delete on public.review_comments to authenticated;
-- Editing changes only the text; a comment can't be moved to another review.
grant update (body) on public.review_comments to authenticated;

create policy review_comments_read on public.review_comments
for select to authenticated
using (
  (select auth.uid()) = author_id
  or exists (
    select 1 from public.reviews r
    where r.user_id = review_comments.review_user_id and r.movie_id = review_comments.movie_id
  )
);

create policy review_comments_insert on public.review_comments
for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and exists (
    select 1 from public.reviews r
    where r.user_id = review_comments.review_user_id and r.movie_id = review_comments.movie_id
  )
);

create policy review_comments_update on public.review_comments
for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy review_comments_delete on public.review_comments
for delete to authenticated
using ((select auth.uid()) = author_id);
