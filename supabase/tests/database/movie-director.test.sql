-- The director column (#61): readable by signed-in users, never writable by them.
\ir ../../seed.sql

select pg_temp.check_equal('starter films have no director until it is looked up',
  (select count(*)::text from public.movies where director is not null), '0');
select pg_temp.expect_error('an empty director is rejected',
  $$update public.movies set director = '' where id = 1$$, '23514');

update public.movies set director = 'Bong Joon Ho' where id = 1;

set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

select pg_temp.check_equal('a signed-in user can read the director',
  (select director from public.movies where id = 1), 'Bong Joon Ho');
select pg_temp.expect_error('a signed-in user cannot change the director',
  $$update public.movies set director = 'Someone Else' where id = 1$$, '42501');
reset role;
