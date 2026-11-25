-- The TMDB rating columns (#85): readable by signed-in users, never writable by
-- them, and kept to TMDB's 0–10 scale.
\ir ../../seed.sql

select pg_temp.check_equal('starter films have no rating until they are searched',
  (select count(*)::text from public.movies where vote_average is not null or vote_count is not null), '0');
select pg_temp.expect_error('a rating above 10 is rejected',
  'update public.movies set vote_average = 10.5 where id = 1', '23514');
select pg_temp.expect_error('a negative rating is rejected',
  'update public.movies set vote_average = -1 where id = 1', '23514');
select pg_temp.expect_error('a negative vote count is rejected',
  'update public.movies set vote_count = -1 where id = 1', '23514');

update public.movies set vote_average = 8.46, vote_count = 19000 where id = 1;
select pg_temp.check_equal('the rating is stored to one decimal place',
  (select vote_average::text from public.movies where id = 1), '8.5');

set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.check_equal('a signed-in user can read the rating',
  (select vote_average || '/' || vote_count from public.movies where id = 1), '8.5/19000');
select pg_temp.expect_error('a signed-in user cannot change the rating',
  'update public.movies set vote_average = 1 where id = 1', '42501');
reset role;
