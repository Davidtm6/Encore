-- The seed and the demo-account script on a fresh database.

\ir ../../seed.sql
\ir ../../seed.sql
select pg_temp.check_equal('the seed adds the 50 starter films and is safe to rerun',
  (select count(*)::text from public.movies where provider = 'tmdb'), '50');
select pg_temp.check_equal('every starter film has a poster',
  (select count(*)::text from public.movies where poster_url is null), '0');

-- Rerunning the TMDB migrations on a seeded database changes nothing.
create temp table catalog_before as select * from public.movies;
\ir ../../migrations/20261029000000_sample_films_to_tmdb.sql
\ir ../../migrations/20261029010000_starter_film_posters.sql
select pg_temp.check('the TMDB migrations are no-ops on a seeded database', not exists (
  (select * from public.movies except select * from catalog_before)
  union all
  (select * from catalog_before except select * from public.movies)));

-- The demo script fills an account that already exists, as it does after
-- someone signs up as demo in the app.
set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000d', '{"username":"demo"}');
reset role;

\ir ../../demo/demo-account.sql
\ir ../../demo/demo-account.sql
select pg_temp.check_equal('the demo script ranks 10 films, leaves 3 unranked, and is safe to rerun',
  (select count(rank_position) || ' ranked, ' || count(*) || ' watched' from public.watched_movies),
  '10 ranked, 13 watched');
select pg_temp.check_equal('the demo ranking has no gaps',
  (select string_agg(rank_position::text, ',' order by rank_position)
   from public.watched_movies where rank_position is not null),
  '1,2,3,4,5,6,7,8,9,10');
select pg_temp.check_equal('the demo''s number one is Parasite, with a review',
  (select m.title || ' / ' || (r.body is not null)::text
   from public.watched_movies w
   join public.movies m on m.id = w.movie_id
   left join public.reviews r on r.user_id = w.user_id and r.movie_id = w.movie_id
   where w.rank_position = 1),
  'Parasite / true');
