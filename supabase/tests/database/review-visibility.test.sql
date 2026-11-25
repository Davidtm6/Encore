-- Review visibility (#15): a 'friends' review is readable by its author and
-- their friends; a 'public' review by every signed-in user. Reviews default to
-- 'friends', and only the author can change a review's visibility.
\ir ../../seed.sql

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-00000000000c', '{"username":"carol"}');
reset role;

set role authenticated;

-- Alice reviews two films: one with the default visibility, one public.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.watched_movies (movie_id) values (1), (2);
insert into public.reviews (movie_id, body) values (1, 'For friends.');
insert into public.reviews (movie_id, body, visibility) values (2, 'For everyone.', 'public');
select pg_temp.check_equal('a review is friends-only unless chosen otherwise',
  (select visibility from public.reviews where movie_id = 1), 'friends');
select pg_temp.check_equal('the author reads all of their own reviews',
  (select count(*)::text from public.reviews), '2');
select pg_temp.expect_error('visibility must be friends or public',
  $$update public.reviews set visibility = 'secret' where movie_id = 1$$, '23514');

-- Alice and Bob are friends; Carol is a stranger.
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000b');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a');

select pg_temp.check_equal('a friend reads friends-only and public reviews',
  (select string_agg(body, ' | ' order by movie_id) from public.reviews), 'For friends. | For everyone.');
select pg_temp.check_equal('is_friend is true for a mutual friend',
  public.is_friend('00000000-0000-0000-0000-00000000000a')::text, 'true');
update public.reviews set visibility = 'public', body = 'Changed by Bob.';
select pg_temp.check_equal('a friend cannot change a review or its visibility',
  (select string_agg(body || ':' || visibility, ' | ' order by movie_id) from public.reviews),
  'For friends.:friends | For everyone.:public');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.check_equal('a stranger reads only public reviews',
  (select string_agg(body, ' | ' order by movie_id) from public.reviews), 'For everyone.');
select pg_temp.check_equal('is_friend is false for a stranger',
  public.is_friend('00000000-0000-0000-0000-00000000000a')::text, 'false');

-- A one-way add doesn't count as a friend.
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a');
select pg_temp.check_equal('adding someone who hasn''t added you back shows only public reviews',
  (select count(*)::text from public.reviews), '1');

-- Alice makes her friends-only review public; now Carol can read it.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.reviews set visibility = 'public' where movie_id = 1;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.check_equal('the author can make a review public',
  (select count(*)::text from public.reviews), '2');

-- Bob is removed as a friend and loses access to friends-only reviews.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.reviews set visibility = 'friends' where movie_id = 1;
delete from public.follows where '00000000-0000-0000-0000-00000000000b' in (follower_id, followee_id);
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check_equal('a removed friend reads only public reviews',
  (select string_agg(body, ' | ' order by movie_id) from public.reviews), 'For everyone.');
reset role;
reset request.jwt.claims;

set role anon;
select pg_temp.expect_error('signed-out visitors cannot read reviews',
  'select count(*) from public.reviews', '42501');
reset role;
