-- Sign-up, saving rankings, reviews, and who can see or change what, using two
-- users and the starter catalog. On this fresh database the seed's first films
-- get ids 1, 2, 3, and so on.
\ir ../../seed.sql

-- Supabase Auth creates users; the trigger gives each one a profile.
set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"username":"bob"}');
reset role;

select pg_temp.check_equal('sign-up creates a profile with the username',
  (select string_agg(username, ',' order by username) from public.profiles), 'alice,bob');
select pg_temp.expect_error('sign-up fails without a username',
  $$insert into auth.users (raw_user_meta_data) values ('{}')$$, '23502');
select pg_temp.expect_error('sign-up fails with a taken username',
  $$insert into auth.users (raw_user_meta_data) values ('{"username":"alice"}')$$, '23505');

-- Alice, signed in.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

insert into public.watched_movies (movie_id) values (1), (2), (3), (4);
select pg_temp.check_equal('watched rows belong to the signed-in user without sending user_id',
  (select count(*)::text from public.watched_movies
   where user_id = '00000000-0000-0000-0000-00000000000a'), '4');
select pg_temp.expect_error('a movie can be marked watched only once',
  'insert into public.watched_movies (movie_id) values (1)', '23505');

-- Rank the first film, insert two more, then reverse the order in one save.
select public.save_ranking(array[1]::bigint[]);
select public.save_ranking(array[2, 1]::bigint[]);
select public.save_ranking(array[2, 3, 1]::bigint[]);
select public.save_ranking(array[1, 3, 2]::bigint[]);
select pg_temp.check_equal('save_ranking rewrites the whole order, even reversed',
  (select string_agg(movie_id::text, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '1,3,2');
select pg_temp.check_equal('watched but unranked movies stay unranked',
  (select count(*)::text from public.watched_movies where rank_position is null), '1');

select pg_temp.expect_error('save_ranking rejects a repeated movie',
  'select public.save_ranking(array[1, 1, 3, 2]::bigint[])', '22023');
select pg_temp.expect_error('save_ranking rejects an empty slot',
  'select public.save_ranking(array[1, null, 3, 2]::bigint[])', '22023');
select pg_temp.expect_error('save_ranking rejects a missing order',
  'select public.save_ranking(null)', '22023');
select pg_temp.expect_error('save_ranking rejects a movie the user has not watched',
  'select public.save_ranking(array[1, 3, 2, 5]::bigint[])', '22023');
select pg_temp.expect_error('save_ranking rejects an order that drops a ranked movie',
  'select public.save_ranking(array[1, 2]::bigint[])', '40001');
select pg_temp.check_equal('a rejected save changes nothing',
  (select string_agg(movie_id::text, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '1,3,2');

-- Reviews: one per watched movie, editable.
insert into public.reviews (movie_id, body) values (1, 'Great.');
select pg_temp.expect_error('a movie gets only one review per user',
  $$insert into public.reviews (movie_id, body) values (1, 'Again')$$, '23505');
select pg_temp.expect_error('only watched movies can be reviewed',
  $$insert into public.reviews (movie_id, body) values (9, 'Never saw it')$$, '23503');
select pg_temp.expect_error('a review cannot be empty',
  $$insert into public.reviews (movie_id, body) values (2, '')$$, '23514');
insert into public.reviews (user_id, movie_id, body)
values ('00000000-0000-0000-0000-00000000000a', 1, 'Even better.')
on conflict (user_id, movie_id) do update set body = excluded.body;
select pg_temp.check_equal('editing replaces the review',
  (select body from public.reviews where movie_id = 1), 'Even better.');

-- Bob, signed in, tries to read and change Alice's data.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';

select pg_temp.check_equal('another user cannot see your watched list',
  (select count(*)::text from public.watched_movies), '0');
select pg_temp.check_equal('signed-in users can read reviews (open question: friends only?)',
  (select count(*)::text from public.reviews), '1');
select pg_temp.expect_error('another user cannot rank your movies',
  'select public.save_ranking(array[1]::bigint[])', '22023');
select pg_temp.expect_error('another user cannot add rows to your list',
  $$insert into public.watched_movies (user_id, movie_id)
    values ('00000000-0000-0000-0000-00000000000a', 5)$$, '42501');
update public.watched_movies set rank_position = 9;
update public.reviews set body = 'Hacked.';
select pg_temp.expect_error('users cannot add movies to the catalog',
  $$insert into public.movies (provider, provider_movie_id, title) values ('tmdb', '1', 'Fake')$$, '42501');
select pg_temp.expect_error('users cannot edit the catalog',
  $$update public.movies set title = 'Fake' where id = 1$$, '42501');

insert into public.watched_movies (movie_id) values (1);
select public.save_ranking(array[1]::bigint[]);
select pg_temp.check_equal('each user ranks their own copy of a movie',
  (select rank_position::text from public.watched_movies where movie_id = 1), '1');

-- Signed out.
reset role;
reset request.jwt.claims;
set role anon;
select pg_temp.expect_error('signed-out users cannot save rankings',
  'select public.save_ranking(array[1]::bigint[])', '42501');
select pg_temp.expect_error('signed-out users cannot read watched lists',
  'select * from public.watched_movies', '42501');
select pg_temp.expect_error('signed-out users cannot read the catalog',
  'select * from public.movies', '42501');
reset role;

-- Back as the database owner: Bob's attempts changed nothing of Alice's.
select pg_temp.check_equal('Alice''s ranking survived Bob''s update',
  (select string_agg(movie_id::text, ',' order by rank_position) from public.watched_movies
   where user_id = '00000000-0000-0000-0000-00000000000a' and rank_position is not null), '1,3,2');
select pg_temp.check_equal('Alice''s review survived Bob''s update',
  (select body from public.reviews where user_id = '00000000-0000-0000-0000-00000000000a'), 'Even better.');
select pg_temp.check_equal('no user has two movies at the same position',
  (select count(*)::text from (
     select user_id, rank_position from public.watched_movies
     where rank_position is not null group by 1, 2 having count(*) > 1) duplicates), '0');
