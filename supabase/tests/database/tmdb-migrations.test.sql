-- The two TMDB migrations on the state the shared database was in before
-- search used TMDB: starter films labeled 'sample', with a watched list, a
-- ranking, and a review pointing at them. Every migration has already run on
-- this empty database, so this inserts those old rows and runs both again.

insert into public.movies (provider, provider_movie_id, title, release_year) values
  ('sample', 'parasite', 'Parasite', 2019),
  ('sample', 'spirited-away', 'Spirited Away', 2001),
  ('sample', 'interstellar', 'Interstellar', 2014),
  ('sample', 'homemade', 'A Film Not in the Starter List', 2020);
-- Someone searched for Interstellar before the migration ran, so TMDB's row
-- already exists, with the poster search saved.
insert into public.movies (provider, provider_movie_id, title, release_year, poster_url)
values ('tmdb', '157336', 'Interstellar', 2014, 'https://image.tmdb.org/t/p/w342/from-search.jpg');

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000d', '{"username":"demo"}');
reset role;
insert into public.watched_movies (user_id, movie_id, rank_position)
select '00000000-0000-0000-0000-00000000000d', id, row_number() over (order by id)
from public.movies where provider = 'sample';
insert into public.reviews (user_id, movie_id, body)
select '00000000-0000-0000-0000-00000000000d', id, 'Still my number one.'
from public.movies where provider_movie_id = 'parasite';

create temp table list_before as
select movie_id, rank_position from public.watched_movies;
create temp table ids_before as
select provider_movie_id as slug, id from public.movies where provider = 'sample';

\ir ../../migrations/20261029000000_sample_films_to_tmdb.sql

select pg_temp.check_equal('starter films get their TMDB IDs',
  (select string_agg(m.provider || ' ' || m.provider_movie_id, ', ' order by m.id)
   from public.movies m join ids_before b on b.id = m.id where b.slug in ('parasite', 'spirited-away')),
  'tmdb 496243, tmdb 129');
select pg_temp.check('relabeled films keep their row ids', not exists (
  select 1 from ids_before b
  where b.slug in ('parasite', 'spirited-away')
    and not exists (select 1 from public.movies m where m.id = b.id and m.provider = 'tmdb')));
select pg_temp.check_equal('a film search already saved is left as it was, not duplicated',
  (select string_agg(provider, ',' order by provider) from public.movies where title = 'Interstellar'),
  'sample,tmdb');
select pg_temp.check_equal('films outside the starter list are untouched',
  (select provider || ' ' || provider_movie_id from public.movies where title like 'A Film Not%'),
  'sample homemade');
select pg_temp.check('the watched list and ranking are unchanged', not exists (
  (select movie_id, rank_position from public.watched_movies except select * from list_before)
  union all
  (select * from list_before except select movie_id, rank_position from public.watched_movies)));
select pg_temp.check_equal('the review still belongs to the same film',
  (select m.provider_movie_id from public.reviews r join public.movies m on m.id = r.movie_id),
  '496243');

-- A search after the relabel saved Parasite's poster before the poster migration.
update public.movies set poster_url = 'https://image.tmdb.org/t/p/w342/newer.jpg'
where provider = 'tmdb' and provider_movie_id = '496243';

\ir ../../migrations/20261029010000_starter_film_posters.sql

select pg_temp.check('starter films without a poster get one',
  (select poster_url like 'https://image.tmdb.org/t/p/w342/%.jpg'
   from public.movies where provider = 'tmdb' and provider_movie_id = '129'));
select pg_temp.check_equal('a poster search saved is kept',
  (select string_agg(poster_url, ', ' order by provider_movie_id) from public.movies
   where provider = 'tmdb' and provider_movie_id in ('157336', '496243')),
  'https://image.tmdb.org/t/p/w342/from-search.jpg, https://image.tmdb.org/t/p/w342/newer.jpg');
select pg_temp.check('films still labeled sample get no poster',
  (select bool_and(poster_url is null) from public.movies where provider = 'sample'));

create temp table catalog_after as select * from public.movies;
\ir ../../migrations/20261029000000_sample_films_to_tmdb.sql
\ir ../../migrations/20261029010000_starter_film_posters.sql
select pg_temp.check('running both migrations again changes nothing', not exists (
  (select * from public.movies except select * from catalog_after)
  union all
  (select * from catalog_after except select * from public.movies)));
