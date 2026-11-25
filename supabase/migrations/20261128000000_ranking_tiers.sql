-- Tiers for ranking (#60). Before comparing, the person says whether they
-- loved a movie, thought it was okay, or didn't like it, and the movie is only
-- compared with others in the same tier. A ranked list is every "loved" movie,
-- then every "okay" one, then every "disliked" one. The app derives each
-- movie's 0.0–10.0 score from its tier and place, so no score is stored.
--
-- Safe to run twice (the tiers test runs it again on old-style rows).

alter table public.watched_movies add column if not exists tier text;

alter table public.watched_movies
  drop constraint if exists watched_movies_tier_valid,
  drop constraint if exists watched_movies_tier_matches_rank;

-- Rankings saved before tiers existed are split into thirds of each person's
-- list: the top third loved, the middle third okay, the bottom third disliked.
-- Re-ranking a movie asks for its tier again.
update public.watched_movies w
set tier = case
  when t.place <= ceil(t.ranked / 3.0) then 'loved'
  when t.place <= ceil(2 * t.ranked / 3.0) then 'okay'
  else 'disliked'
end
from (
  select user_id, movie_id,
    row_number() over (partition by user_id order by rank_position) as place,
    count(*) over (partition by user_id) as ranked
  from public.watched_movies
  where rank_position is not null
) t
where w.user_id = t.user_id
  and w.movie_id = t.movie_id
  and w.tier is null;

alter table public.watched_movies
  add constraint watched_movies_tier_valid check (tier in ('loved', 'okay', 'disliked')),
  -- A ranked movie always has a tier, and an unranked one never does.
  add constraint watched_movies_tier_matches_rank check ((rank_position is null) = (tier is null));

-- save_ranking now takes each movie's tier alongside the order. The old
-- one-argument version is dropped, so an out-of-date app can't save a ranking
-- without tiers.
drop function if exists public.save_ranking(bigint[]);
drop function if exists public.save_ranking(bigint[], text[]);

-- Saves the caller's whole ranking. p_order lists movie IDs, best first, and
-- must contain every movie that is already ranked; p_tiers gives each one's
-- tier, in the same order, best tier first. Runs as the caller, so RLS applies
-- to every read and write.
create function public.save_ranking(p_order bigint[], p_tiers text[])
returns void language plpgsql set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Sign in to save a ranking.' using errcode = '28000';
  end if;

  -- Lock the caller's rows so two sessions save one after the other.
  perform 1 from public.watched_movies where user_id = caller for update;

  if p_order is null
    or array_position(p_order, null) is not null
    or cardinality(p_order) <> (select count(distinct id) from unnest(p_order) as id)
  then
    raise exception 'The ranking has a missing or repeated movie.'
      using errcode = '22023';
  end if;

  if p_tiers is null
    or cardinality(p_tiers) <> cardinality(p_order)
    or exists (
      select 1 from unnest(p_tiers) as t(tier)
      where t.tier is null or t.tier not in ('loved', 'okay', 'disliked')
    )
  then
    raise exception 'Each ranked movie needs a tier: loved, okay, or disliked.'
      using errcode = '22023';
  end if;

  -- Loved movies first, then okay, then disliked: a tier is never better than
  -- the one above it.
  if exists (
    select 1
    from (
      select array_position(array['loved', 'okay', 'disliked'], t.tier) as level,
        lag(array_position(array['loved', 'okay', 'disliked'], t.tier)) over (order by t.place) as level_above
      from unnest(p_tiers) with ordinality as t(tier, place)
    ) levels
    where levels.level < levels.level_above
  ) then
    raise exception 'The ranking has to list loved movies first, then okay, then disliked.'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_order) as id
    where not exists (
      select 1 from public.watched_movies w
      where w.user_id = caller and w.movie_id = id
    )
  ) then
    raise exception 'Only movies in your watched list can be ranked.'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from public.watched_movies w
    where w.user_id = caller
      and w.rank_position is not null
      and w.movie_id <> all (p_order)
  ) then
    raise exception 'Your ranking changed in another session. Reload and try again.'
      using errcode = '40001';
  end if;

  -- One statement, so the deferrable unique_user_rank check runs once at the
  -- end instead of failing partway through a reorder.
  update public.watched_movies w
  set rank_position = o.position::integer,
    tier = p_tiers[o.position]
  from unnest(p_order) with ordinality as o(movie_id, position)
  where w.user_id = caller and w.movie_id = o.movie_id;
end;
$$;

revoke execute on function public.save_ranking(bigint[], text[]) from public, anon;
grant execute on function public.save_ranking(bigint[], text[]) to authenticated;
