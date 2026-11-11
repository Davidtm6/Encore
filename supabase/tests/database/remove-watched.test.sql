-- Removing a movie from the watched list (#49): the rest of the ranking closes
-- up, the review goes too, and nobody can remove another user's movies.
\ir ../../seed.sql

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"username":"bob"}');
reset role;

-- Bob ranks two films, so we can check Alice's removals never touch his list.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
insert into public.watched_movies (movie_id) values (1), (2);
select public.save_ranking(array[2, 1]::bigint[]);

-- Alice ranks five films, leaves a sixth unranked, and reviews film 3.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.watched_movies (movie_id) values (1), (2), (3), (4), (5), (6);
select public.save_ranking(array[1, 2, 3, 4, 5]::bigint[]);
insert into public.reviews (movie_id, body) values (3, 'Loved it.');

delete from public.watched_movies where movie_id = 2;
select pg_temp.check_equal('removing #2 closes the gap in the ranking',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '1@1,3@2,4@3,5@4');

delete from public.watched_movies where movie_id = 3;
select pg_temp.check_equal('removing a movie removes its review',
  (select count(*)::text from public.reviews where movie_id = 3), '0');

delete from public.watched_movies where movie_id = 6;
select pg_temp.check_equal('removing an unranked movie leaves the ranking alone',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '1@1,4@2,5@3');

-- Two ranked movies in one statement, which a per-row shift would get wrong.
insert into public.watched_movies (movie_id) values (7), (8);
select public.save_ranking(array[7, 1, 4, 8, 5]::bigint[]);
delete from public.watched_movies where movie_id in (1, 8);
select pg_temp.check_equal('removing several ranked movies at once renumbers the rest in order',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '7@1,4@2,5@3');

select public.save_ranking(array[5, 7, 4]::bigint[]);
select pg_temp.check_equal('save_ranking still works after a removal',
  (select string_agg(movie_id::text, ',' order by rank_position)
   from public.watched_movies where rank_position is not null), '5,7,4');

-- Bob can't remove Alice's movies: RLS hides her rows, so nothing is deleted.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
delete from public.watched_movies where user_id = '00000000-0000-0000-0000-00000000000a';
reset role;
reset request.jwt.claims;

select pg_temp.check_equal('another user cannot remove your movies',
  (select string_agg(movie_id::text, ',' order by rank_position) from public.watched_movies
   where user_id = '00000000-0000-0000-0000-00000000000a' and rank_position is not null), '5,7,4');
select pg_temp.check_equal('your removals never change another user''s ranking',
  (select string_agg(movie_id || '@' || rank_position, ',' order by rank_position) from public.watched_movies
   where user_id = '00000000-0000-0000-0000-00000000000b'), '2@1,1@2');

-- Deleting an account cascades through every row; the trigger has nothing left to renumber.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check_equal('deleting an account still removes all of its watched rows',
  (select count(*)::text from public.watched_movies
   where user_id = '00000000-0000-0000-0000-00000000000a'), '0');
