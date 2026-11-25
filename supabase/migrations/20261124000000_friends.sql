-- Friends (#39, #40). Each person adds the other; two people are friends when
-- both have. There are no request rows: adding someone who hasn't added you
-- back is the request, and it shows up in their "Added you" list.
--
-- Friends can read each other's watched lists and rankings. Nobody else can,
-- including someone you haven't added back. Profiles and reviews were already
-- readable by every signed-in user (see the initial migration), so this
-- migration only adds a read rule to watched_movies.

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

-- "Who added me" is looked up by followee.
create index follows_followee_id on public.follows (followee_id);

alter table public.follows enable row level security;

revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;

-- You see the adds you made and the adds made to you, nothing else.
create policy follows_read on public.follows
for select to authenticated
using ((select auth.uid()) in (follower_id, followee_id));

-- You can only add people as yourself.
create policy follows_insert on public.follows
for insert to authenticated
with check ((select auth.uid()) = follower_id);

-- Either person can delete an add between them, so removing a friend clears
-- both directions and someone who added you can be dismissed.
create policy follows_delete on public.follows
for delete to authenticated
using ((select auth.uid()) in (follower_id, followee_id));

-- A friend's watched list, read only. The existing watched_owner policy still
-- limits every write to the owner. Both lookups read follows rows that involve
-- the caller, which follows_read allows, so no security definer is needed.
create policy watched_friends_read on public.watched_movies
for select to authenticated
using (
  exists (
    select 1 from public.follows f
    where f.follower_id = (select auth.uid()) and f.followee_id = watched_movies.user_id
  )
  and exists (
    select 1 from public.follows f
    where f.follower_id = watched_movies.user_id and f.followee_id = (select auth.uid())
  )
);
