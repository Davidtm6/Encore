-- Each film's TMDB audience score (#85), shown in search results as one more
-- way to tell films apart. TMDB's search and popular results include it, so
-- the search-movies function saves it with the rest of the row and refreshes
-- it on every search. Null when TMDB has none or the film hasn't been searched
-- since this migration. The app only reads movies, so it can't write these.

alter table public.movies
  add column vote_average numeric(3, 1)
    check (vote_average is null or vote_average between 0 and 10),
  add column vote_count integer
    check (vote_count is null or vote_count >= 0);
