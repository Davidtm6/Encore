-- Gives an existing account a ready-made list for demos: 10 ranked films,
-- 3 watched but unranked, and one review. Sign up in the app first, set
-- demo_username below, then run this in the dashboard SQL editor.
-- It replaces that account's watched list and reviews.

do $$
declare
  demo_username text := 'demo';
  demo_id uuid;
begin
  select id into demo_id from public.profiles where username = demo_username;
  if demo_id is null then
    raise exception 'No profile named %. Sign up in the app first.', demo_username;
  end if;

  -- Reviews cascade from watched_movies.
  delete from public.watched_movies where user_id = demo_id;

  insert into public.watched_movies (user_id, movie_id, rank_position)
  select demo_id, m.id, r.position
  from unnest(array[
    'parasite', 'spirited-away', 'past-lives', 'whiplash', 'mad-max-fury-road',
    'get-out', 'la-la-land', 'inception', 'everything-everywhere',
    'grand-budapest-hotel'
  ]) with ordinality as r(slug, position)
  join public.movies m
    on m.provider = 'sample' and m.provider_movie_id = r.slug;

  insert into public.watched_movies (user_id, movie_id)
  select demo_id, m.id
  from public.movies m
  where m.provider = 'sample'
    and m.provider_movie_id in ('dune-part-two', 'moonlight', 'arrival');

  insert into public.reviews (user_id, movie_id, body)
  select demo_id, m.id,
    'Funny, tense, and heartbreaking, sometimes in the same scene. Still my number one.'
  from public.movies m
  where m.provider = 'sample' and m.provider_movie_id = 'parasite';
end;
$$;
