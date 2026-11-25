-- Friends (#39, #40): two people are friends once each has added the other.
-- Only friends can read each other's watched lists and rankings; one-way adds
-- and strangers see nothing, and nobody can change someone else's list.
\ir ../../seed.sql

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-00000000000c', '{"username":"carol"}');
reset role;

set role authenticated;

-- Bob ranks two films and reviews one.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
insert into public.watched_movies (movie_id) values (1), (2), (3);
select public.save_ranking(array[2, 1]::bigint[]);
insert into public.reviews (movie_id, body) values (2, 'A favorite.');

-- Alice ranks one film.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.watched_movies (movie_id) values (4);
select public.save_ranking(array[4]::bigint[]);

-- Alice adds Bob. He hasn't added her back, so neither sees the other's list.
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000b');
select pg_temp.check_equal('adding someone records you as the follower',
  (select follower_id::text from public.follows), '00000000-0000-0000-0000-00000000000a');
select pg_temp.check_equal('a one-way add does not show their list',
  (select count(*)::text from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000b'), '0');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check_equal('the person added sees who added them',
  (select count(*)::text from public.follows where followee_id = '00000000-0000-0000-0000-00000000000b'), '1');
select pg_temp.check_equal('being added does not show the adder''s list either',
  (select count(*)::text from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000a'), '0');

-- Bob adds Alice back: now they're friends.
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a');
select pg_temp.check_equal('a friend sees your ranking',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position)
   from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000a'), '4@1');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.check_equal('you see a friend''s ranking, best first, and their unranked films',
  (select string_agg(movie_id || '@' || coalesce(rank_position::text, '-'), ',' order by rank_position nulls last)
   from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000b'), '2@1,1@2,3@-');
select pg_temp.check_equal('you see a friend''s reviews with their list',
  (select r.body from public.watched_movies w
   join public.reviews r on r.user_id = w.user_id and r.movie_id = w.movie_id
   where w.user_id = '00000000-0000-0000-0000-00000000000b'), 'A favorite.');

-- Friendship gives read access only.
update public.watched_movies set rank_position = 9 where user_id = '00000000-0000-0000-0000-00000000000b';
delete from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check_equal('a friend cannot change or delete your list',
  (select string_agg(movie_id || '@' || coalesce(rank_position::text, '-'), ',' order by rank_position nulls last)
   from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000b'), '2@1,1@2,3@-');
select pg_temp.expect_error('a friend cannot add films to your list',
  $$insert into public.watched_movies (user_id, movie_id) values ('00000000-0000-0000-0000-00000000000b', 5)$$, '42501');
-- save_ranking must still treat only your own films as "the whole list", even
-- though a friend's films are now visible to you.
select public.save_ranking(array[4]::bigint[]);
select pg_temp.check_equal('save_ranking ignores a friend''s visible films',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position)
   from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000a'), '4@1');

-- Carol is a stranger to both. She can't see their lists or their adds, and
-- can't add anyone on someone else's behalf.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.check_equal('a stranger sees no one else''s list',
  (select count(*)::text from public.watched_movies), '0');
select pg_temp.check_equal('a stranger sees no one else''s adds',
  (select count(*)::text from public.follows), '0');
select pg_temp.expect_error('you cannot add a friend as someone else',
  $$insert into public.follows (follower_id, followee_id)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c')$$, '42501');
select pg_temp.expect_error('you cannot add yourself',
  $$insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000c')$$, '23514');
delete from public.follows;

-- Carol adds Alice and can't make that one-way add show Alice's list.
insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error('adding the same person twice is rejected',
  $$insert into public.follows (followee_id) values ('00000000-0000-0000-0000-00000000000a')$$, '23505');
select pg_temp.check_equal('adding someone who hasn''t added you back shows nothing',
  (select count(*)::text from public.watched_movies), '0');

-- Alice removes Bob as a friend, which clears both directions.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
delete from public.follows
where (follower_id = '00000000-0000-0000-0000-00000000000a' and followee_id = '00000000-0000-0000-0000-00000000000b')
   or (follower_id = '00000000-0000-0000-0000-00000000000b' and followee_id = '00000000-0000-0000-0000-00000000000a');
select pg_temp.check_equal('after removing a friend, their list is hidden again',
  (select count(*)::text from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000b'), '0');

-- Alice dismisses Carol's add, which the person added is allowed to do.
delete from public.follows where follower_id = '00000000-0000-0000-0000-00000000000c';
reset role;
reset request.jwt.claims;

select pg_temp.check_equal('both directions are gone after removing a friend, and a dismissed add is gone',
  (select count(*)::text from public.follows), '0');
select pg_temp.check_equal('friends'' read access never changed anyone''s list',
  (select string_agg(user_id::text || ':' || movie_id || '@' || coalesce(rank_position::text, '-'), ','
     order by user_id, rank_position nulls last) from public.watched_movies),
  '00000000-0000-0000-0000-00000000000a:4@1,'
  || '00000000-0000-0000-0000-00000000000b:2@1,00000000-0000-0000-0000-00000000000b:1@2,00000000-0000-0000-0000-00000000000b:3@-');

-- Signed-out visitors get nothing from the new table.
set role anon;
select pg_temp.expect_error('signed-out visitors cannot read adds',
  'select count(*) from public.follows', '42501');
reset role;
