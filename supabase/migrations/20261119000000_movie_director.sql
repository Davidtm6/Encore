-- Each film's director (#61), shown next to its title and year so similar
-- films can be told apart. TMDB's search results don't include it, so the
-- search-movies function fills it in from TMDB's credits, with the admin
-- client, for films on someone's list. Several directors are stored joined,
-- for example 'Lana Wachowski, Lilly Wachowski'. Null means not looked up yet
-- or TMDB has none. The app still only reads movies (grant select in the
-- initial migration), so it can't write this column.

alter table public.movies add column director text
  check (director is null or char_length(director) > 0);
