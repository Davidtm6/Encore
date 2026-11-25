-- Gives an existing account a long ranked list (#64), so ranking and
-- re-ranking against hundreds of films can be checked by hand in the app.
-- Sign up in the app first, set large_username and list_size below, then run
-- this in the dashboard SQL editor. It replaces that account's watched list
-- and reviews, so don't point it at someone's real account.
--
-- It ranks up to list_size of the films already saved in public.movies (the
-- 50 starter films plus everything anyone has searched), in a shuffled but
-- repeatable order. If fewer films are saved, it ranks them all and says so;
-- searching in the app saves more. The list is split into thirds by tier
-- (#60): the top third loved, the middle okay, the bottom disliked.

do $$
declare
  large_username text := 'biglist';
  list_size integer := 250;
  large_id uuid;
  ranked integer;
begin
  select id into large_id from public.profiles where username = large_username;
  if large_id is null then
    raise exception 'No profile named %. Sign up in the app first.', large_username;
  end if;

  -- Reviews cascade from watched_movies.
  delete from public.watched_movies where user_id = large_id;

  insert into public.watched_movies (user_id, movie_id, rank_position, tier)
  select large_id, id, place,
    case
      when place <= ceil(total / 3.0) then 'loved'
      when place <= ceil(2 * total / 3.0) then 'okay'
      else 'disliked'
    end
  from (
    select id,
      row_number() over (order by md5(id::text)) as place,
      count(*) over () as total
    from (
      select id from public.movies
      order by md5(id::text)
      limit list_size
    ) chosen
  ) numbered;

  get diagnostics ranked = row_count;
  if ranked < list_size then
    raise notice 'Only % films are saved, so % has % ranked films, not %.',
      ranked, large_username, ranked, list_size;
  else
    raise notice '% now has % ranked films.', large_username, ranked;
  end if;
end;
$$;
