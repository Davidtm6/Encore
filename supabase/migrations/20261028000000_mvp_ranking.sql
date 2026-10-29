-- First-demo additions: a profile for every new account, default owners on
-- user rows, and the atomic ranking save. Until the Encore API exists, the app
-- calls Supabase directly and these policies and functions are the boundary.

-- Every account gets a profile from the username the app passes at sign-up.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- The app never sends user_id; the existing policies still check it.
alter table public.watched_movies alter column user_id set default auth.uid();
alter table public.reviews alter column user_id set default auth.uid();

-- Saves the caller's whole ranking. p_order lists movie IDs, best first, and
-- must contain every movie that is already ranked. Runs as the caller, so RLS
-- applies to every read and write.
create function public.save_ranking(p_order bigint[])
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
  set rank_position = o.position::integer
  from unnest(p_order) with ordinality as o(movie_id, position)
  where w.user_id = caller and w.movie_id = o.movie_id;
end;
$$;

revoke execute on function public.save_ranking(bigint[]) from public, anon;
grant execute on function public.save_ranking(bigint[]) to authenticated;
