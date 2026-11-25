-- Comments on reviews (#41): anyone who can read a review can comment on it,
-- only a comment's author can edit or delete it, and deleting the review
-- deletes its comments.
\ir ../../seed.sql

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-00000000000c', '{"username":"carol"}');
reset role;

set role authenticated;

-- Alice writes a friends-only review of film 1 and a public review of film 2.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.watched_movies (movie_id) values (1), (2);
insert into public.reviews (movie_id, body) values (1, 'For friends.');
insert into public.reviews (movie_id, body, visibility) values (2, 'For everyone.', 'public');
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000b');

-- Bob is Alice's friend: he can comment on both reviews.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a');
insert into public.review_comments (review_user_id, movie_id, body)
  values ('00000000-0000-0000-0000-00000000000a', 1, 'Agreed!');
select pg_temp.check_equal('a comment is written as the signed-in user',
  (select author_id::text from public.review_comments), '00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error('a comment cannot be written as someone else',
  $$insert into public.review_comments (review_user_id, movie_id, author_id, body)
    values ('00000000-0000-0000-0000-00000000000a', 1, '00000000-0000-0000-0000-00000000000c', 'Fake')$$, '42501');
select pg_temp.expect_error('a comment cannot be empty',
  $$insert into public.review_comments (review_user_id, movie_id, body)
    values ('00000000-0000-0000-0000-00000000000a', 1, '')$$, '23514');
select pg_temp.expect_error('a comment needs a review to attach to',
  $$insert into public.review_comments (review_user_id, movie_id, body)
    values ('00000000-0000-0000-0000-00000000000a', 3, 'No review here')$$, '42501');

-- Carol is a stranger: she can comment only on the public review.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.check_equal('a stranger cannot see comments on a friends-only review',
  (select count(*)::text from public.review_comments), '0');
select pg_temp.expect_error('a stranger cannot comment on a friends-only review',
  $$insert into public.review_comments (review_user_id, movie_id, body)
    values ('00000000-0000-0000-0000-00000000000a', 1, 'Let me in')$$, '42501');
insert into public.review_comments (review_user_id, movie_id, body)
  values ('00000000-0000-0000-0000-00000000000a', 2, 'Nice review.');
select pg_temp.check_equal('anyone can comment on a public review',
  (select count(*)::text from public.review_comments), '1');

-- Only the author can edit or delete a comment.
update public.review_comments set body = 'Edited by Carol.';
select pg_temp.check_equal('the author can edit their comment',
  (select body from public.review_comments), 'Edited by Carol.');
select pg_temp.expect_error('a comment cannot be moved to another review',
  $$update public.review_comments set movie_id = 1$$, '42501');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.check_equal('the review''s author sees every comment on it',
  (select string_agg(body, ' | ' order by id) from public.review_comments), 'Agreed! | Edited by Carol.');
update public.review_comments set body = 'Changed by Alice.';
delete from public.review_comments;
select pg_temp.check_equal('the review''s author cannot edit or delete others'' comments',
  (select string_agg(body, ' | ' order by id) from public.review_comments), 'Agreed! | Edited by Carol.');

-- Alice makes the public review friends-only: Carol's comment is hidden from
-- everyone but Carol, who can still delete it.
update public.reviews set visibility = 'friends' where movie_id = 2;
select pg_temp.check_equal('a stranger''s comment is hidden once the review is friends-only',
  (select count(*)::text from public.review_comments where movie_id = 2), '0');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.check_equal('the stranger still sees their own comment',
  (select count(*)::text from public.review_comments), '1');
delete from public.review_comments;
select pg_temp.check_equal('the author can delete their comment',
  (select count(*)::text from public.review_comments), '0');

-- Deleting the review deletes its comments.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
delete from public.reviews where movie_id = 1;
reset role;
reset request.jwt.claims;
select pg_temp.check_equal('deleting a review deletes its comments',
  (select count(*)::text from public.review_comments), '0');

set role anon;
select pg_temp.expect_error('signed-out visitors cannot read comments',
  'select count(*) from public.review_comments', '42501');
reset role;
