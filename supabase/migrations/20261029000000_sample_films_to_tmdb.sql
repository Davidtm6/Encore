-- Relabels the 50 starter films with their TMDB IDs now that search uses TMDB
-- (supabase/functions/search-movies). Each row keeps its id, so watched lists,
-- rankings, and reviews are untouched, and a TMDB search for one of these films
-- updates the same row, adding its poster, instead of saving a second copy.
update public.movies m
set provider = 'tmdb', provider_movie_id = v.tmdb_id
from (values
  ('parasite', '496243'),
  ('spirited-away', '129'),
  ('past-lives', '666277'),
  ('whiplash', '244786'),
  ('mad-max-fury-road', '76341'),
  ('get-out', '419430'),
  ('la-la-land', '313369'),
  ('inception', '27205'),
  ('everything-everywhere', '545611'),
  ('grand-budapest-hotel', '120467'),
  ('dune-part-two', '693134'),
  ('moonlight', '376867'),
  ('portrait-of-a-lady-on-fire', '531428'),
  ('arrival', '329865'),
  ('knives-out', '546554'),
  ('lady-bird', '391713'),
  ('into-the-spider-verse', '324857'),
  ('the-social-network', '37799'),
  ('the-godfather', '238'),
  ('pulp-fiction', '680'),
  ('the-dark-knight', '155'),
  ('interstellar', '157336'),
  ('the-shawshank-redemption', '278'),
  ('goodfellas', '769'),
  ('alien', '348'),
  ('back-to-the-future', '105'),
  ('jurassic-park', '329'),
  ('the-matrix', '603'),
  ('toy-story', '862'),
  ('wall-e', '10681'),
  ('up', '14160'),
  ('coco', '354912'),
  ('your-name', '372058'),
  ('princess-mononoke', '128'),
  ('amelie', '194'),
  ('oldboy', '670'),
  ('pans-labyrinth', '1417'),
  ('no-country-for-old-men', '6977'),
  ('there-will-be-blood', '7345'),
  ('her', '152601'),
  ('ex-machina', '264660'),
  ('blade-runner-2049', '335984'),
  ('little-women', '331482'),
  ('oppenheimer', '872585'),
  ('barbie', '346698'),
  ('top-gun-maverick', '361743'),
  ('aftersun', '965150'),
  ('anatomy-of-a-fall', '915935'),
  ('poor-things', '792307'),
  ('across-the-spider-verse', '569094')
) as v(slug, tmdb_id)
where m.provider = 'sample'
  and m.provider_movie_id = v.slug
  -- If search already saved the TMDB row, leave the sample row alone rather
  -- than break the unique (provider, provider_movie_id) key.
  and not exists (
    select 1 from public.movies t
    where t.provider = 'tmdb' and t.provider_movie_id = v.tmdb_id
  );
