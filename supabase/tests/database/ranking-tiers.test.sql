-- Tiers (#60): splitting rankings saved before tiers into thirds, and
-- save_ranking keeping loved, okay, and disliked movies in order.
\ir ../../seed.sql

set role supabase_auth_admin;
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"username":"one"}'),
  ('00000000-0000-0000-0000-000000000002', '{"username":"two"}'),
  ('00000000-0000-0000-0000-000000000003', '{"username":"three"}'),
  ('00000000-0000-0000-0000-000000000007', '{"username":"seven"}');
reset role;

-- Rankings as they were before tiers: positions only. Every migration has
-- already run on this database, so take the tier rules off, give these users
-- old-style rows, and run the tiers migration again.
alter table public.watched_movies
  drop constraint watched_movies_tier_valid,
  drop constraint watched_movies_tier_matches_rank;
insert into public.watched_movies (user_id, movie_id, rank_position)
select u.id, m.id, m.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 1),
  ('00000000-0000-0000-0000-000000000002'::uuid, 2),
  ('00000000-0000-0000-0000-000000000003'::uuid, 3),
  ('00000000-0000-0000-0000-000000000007'::uuid, 7)
) as u(id, ranked)
join public.movies m on m.id <= u.ranked;
-- Seven also has a film watched but not ranked.
insert into public.watched_movies (user_id, movie_id)
values ('00000000-0000-0000-0000-000000000007', 8);

\ir ../../migrations/20261128000000_ranking_tiers.sql

create function pg_temp.tiers_of(who uuid) returns text language sql as $$
  select string_agg(coalesce(tier, '-'), ',' order by rank_position nulls last)
  from public.watched_movies where user_id = who
$$;

select pg_temp.check_equal('a list of one is loved',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000001'), 'loved');
select pg_temp.check_equal('a list of two splits loved, okay',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000002'), 'loved,okay');
select pg_temp.check_equal('a list of three splits into thirds',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000003'), 'loved,okay,disliked');
select pg_temp.check_equal('a list of seven splits 3, 2, 2, and unranked films get no tier',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000007'),
  'loved,loved,loved,okay,okay,disliked,disliked,-');
select pg_temp.expect_error('a ranked film must have a tier',
  $$insert into public.watched_movies (user_id, movie_id, rank_position)
    values ('00000000-0000-0000-0000-000000000001', 9, 2)$$, '23514');
select pg_temp.expect_error('an unranked film can''t have a tier',
  $$insert into public.watched_movies (user_id, movie_id, tier)
    values ('00000000-0000-0000-0000-000000000001', 9, 'okay')$$, '23514');
select pg_temp.expect_error('only the three tiers are allowed',
  $$update public.watched_movies set tier = 'great'
    where user_id = '00000000-0000-0000-0000-000000000001'$$, '23514');

-- Seven, signed in, re-ranks.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000007"}';

select public.save_ranking(
  array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[],
  array['loved', 'loved', 'okay', 'okay', 'okay', 'disliked', 'disliked', 'disliked']);
select pg_temp.check_equal('save_ranking saves each film''s tier with its place',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000007'),
  'loved,loved,okay,okay,okay,disliked,disliked,disliked');
select pg_temp.check_equal('and the order',
  (select string_agg(movie_id::text, ',' order by rank_position) from public.watched_movies
   where user_id = '00000000-0000-0000-0000-000000000007'), '7,1,2,3,4,5,6,8');

select pg_temp.expect_error('save_ranking rejects a loved film below an okay one',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[],
    array['loved', 'okay', 'loved', 'okay', 'okay', 'disliked', 'disliked', 'disliked'])$$, '22023');
select pg_temp.expect_error('save_ranking rejects too few tiers',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[], array['loved', 'loved'])$$, '22023');
select pg_temp.expect_error('save_ranking rejects an unknown tier',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[],
    array['great', 'loved', 'okay', 'okay', 'okay', 'disliked', 'disliked', 'disliked'])$$, '22023');
select pg_temp.expect_error('save_ranking rejects a missing tier',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[],
    array[null, 'loved', 'okay', 'okay', 'okay', 'disliked', 'disliked', 'disliked'])$$, '22023');
select pg_temp.expect_error('save_ranking rejects no tiers at all',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[], null)$$, '22023');
select pg_temp.check_equal('a rejected save changes nothing',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000007'),
  'loved,loved,okay,okay,okay,disliked,disliked,disliked');

select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[], array_fill('disliked'::text, array[8]));
select pg_temp.check_equal('a whole list in one tier is fine',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000007'),
  'disliked,disliked,disliked,disliked,disliked,disliked,disliked,disliked');
select pg_temp.expect_error('the old one-argument save_ranking is gone',
  $$select public.save_ranking(array[7, 1, 2, 3, 4, 5, 6, 8]::bigint[])$$, '42883');

-- Removing a film keeps the others' tiers, and the order stays valid.
reset role;
update public.watched_movies set tier = case when rank_position <= 2 then 'loved' else 'okay' end
where user_id = '00000000-0000-0000-0000-000000000007';
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000007"}';
delete from public.watched_movies where movie_id = 1;
select pg_temp.check_equal('removing a film keeps the other films'' tiers',
  pg_temp.tiers_of('00000000-0000-0000-0000-000000000007'), 'loved,okay,okay,okay,okay,okay,okay');
