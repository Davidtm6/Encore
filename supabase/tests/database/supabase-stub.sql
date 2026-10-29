-- A stand-in for the parts of Supabase the migrations rely on, so they can run
-- on plain Postgres: the anon and authenticated roles, the role Supabase Auth
-- uses to create users, auth.users, and auth.uid(). Tests act as a user with
--   set role authenticated;
--   set request.jwt.claims = '{"sub":"<user id>"}';
-- which is how Supabase passes the signed-in user to Postgres.

-- Roles belong to the whole server, so create them only once.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role supabase_auth_admin nologin; exception when duplicate_object then null; end $$;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, supabase_auth_admin;
grant usage on schema public to anon, authenticated;
grant insert, select on auth.users to supabase_auth_admin;

-- Supabase grants execute on new public functions to anon and authenticated;
-- the migrations revoke it where it isn't wanted.
alter default privileges in schema public grant execute on functions to anon, authenticated;
