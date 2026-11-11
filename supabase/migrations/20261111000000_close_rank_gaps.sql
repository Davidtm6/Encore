-- Removing a movie from the watched list (#49). The app deletes the
-- watched_movies row directly (the watched_owner policy already limits that to
-- the caller's own rows), and its review goes with it through the existing
-- cascade. This trigger then renumbers the rest of that user's ranking, so a
-- removed #2 of 4 leaves 1, 2, 3 instead of 1, 3, 4.
--
-- It runs once per statement, in the same statement as the delete, so the
-- ranking is never left with a gap. Renumbering every affected user from
-- row_number() also handles deleting several ranked rows at once. Runs as the
-- caller, so RLS applies to the update.

create function public.close_rank_gaps()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- One statement, so the deferrable unique_user_rank check runs once at the
  -- end instead of failing partway through the shift.
  update public.watched_movies w
  set rank_position = r.new_position
  from (
    select user_id, movie_id,
      row_number() over (partition by user_id order by rank_position)::integer as new_position
    from public.watched_movies
    where rank_position is not null
      and user_id in (select user_id from removed where rank_position is not null)
  ) r
  where w.user_id = r.user_id
    and w.movie_id = r.movie_id
    and w.rank_position <> r.new_position;
  return null;
end;
$$;

revoke execute on function public.close_rank_gaps() from public, anon, authenticated;

create trigger close_rank_gaps after delete on public.watched_movies
referencing old table as removed
for each statement execute function public.close_rank_gaps();
