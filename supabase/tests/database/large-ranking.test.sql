-- Ranking with 1,000 films (#64). save_ranking rewrites every position on each
-- save, so check it stays correct and fast for a list far longer than the
-- team's own: a first save, adding one more film at #1 (which moves every
-- other film down), and reversing the whole list. Every film is 'loved', so
-- any order is a valid tier order (tiers have their own test).

-- 1,001 films, beyond the starter catalog. Only the database owner can add movies.
insert into public.movies (provider, provider_movie_id, title)
select 'test', n::text, 'Film ' || n
from generate_series(1, 1001) as n;

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000a', '{"username":"alice"}');
reset role;

set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

insert into public.watched_movies (movie_id)
select id from public.movies where provider = 'test';

-- The first 1,000 films, best first in title order.
create temp table timing (step text primary key, took interval);
create temp table first_order as
select array_agg(id order by provider_movie_id::integer) as ids
from public.movies where provider = 'test' and provider_movie_id::integer <= 1000;

do $$
declare
  started timestamptz := clock_timestamp();
begin
  perform public.save_ranking((select ids from first_order), array_fill('loved'::text, array[1000]));
  insert into timing values ('first save', clock_timestamp() - started);
end;
$$;

select pg_temp.check_equal('a 1,000-film ranking is saved as 1, 2, ..., 1000 in order',
  (select count(*)::text from public.watched_movies w
   join public.movies m on m.id = w.movie_id
   where w.rank_position = m.provider_movie_id::integer), '1000');
select pg_temp.check_equal('the film not in the order stays unranked',
  (select string_agg(m.title, ',') from public.watched_movies w
   join public.movies m on m.id = w.movie_id where w.rank_position is null), 'Film 1001');

-- Film 1001 goes in at #1, so all 1,000 others move down one place.
do $$
declare
  started timestamptz := clock_timestamp();
begin
  perform public.save_ranking(
    (select array_prepend(m.id, f.ids) from public.movies m, first_order f
     where m.provider = 'test' and m.provider_movie_id = '1001'),
    array_fill('loved'::text, array[1001]));
  insert into timing values ('add at #1', clock_timestamp() - started);
end;
$$;

select pg_temp.check_equal('adding a film at #1 moves every other film down one place',
  (select count(*)::text from public.watched_movies w
   join public.movies m on m.id = w.movie_id
   where w.rank_position = (m.provider_movie_id::integer % 1001) + 1), '1001');

-- Reverse the whole list in one save.
do $$
declare
  started timestamptz := clock_timestamp();
begin
  perform public.save_ranking(
    (select array_agg(w.movie_id order by w.rank_position desc) from public.watched_movies w),
    array_fill('loved'::text, array[1001]));
  insert into timing values ('reverse', clock_timestamp() - started);
end;
$$;

select pg_temp.check_equal('reversing 1,001 films keeps positions 1 to 1001 with no gaps or repeats',
  (select count(distinct rank_position) || ',' || min(rank_position) || ',' || max(rank_position)
   from public.watched_movies), '1001,1,1001');
select pg_temp.check_equal('after reversing, the old last film is #1',
  (select m.title from public.watched_movies w join public.movies m on m.id = w.movie_id
   where w.rank_position = 1), 'Film 1000');

-- Generous, so a slow CI machine doesn't fail it. Each time is also listed as
-- its own passing line, so the CI log shows the numbers for docs/testing.md.
select pg_temp.check('each 1,000-film save finishes in under 5 seconds',
  (select bool_and(took < interval '5 seconds') from timing));
select pg_temp.check(step || ' took ' || round(extract(epoch from took) * 1000) || ' ms', true)
from timing order by step;

reset role;
reset request.jwt.claims;
