-- Who can read a review (#15). Each review is either 'friends' (the author and
-- the people they're friends with) or 'public' (every signed-in user), chosen
-- by its author. New reviews default to 'friends', and reviews written before
-- this migration become 'friends' too, so no review is shown to more people
-- than its author has chosen.

-- True when the signed-in user and `other` have each added the other (see the
-- friends migration). Runs as the caller: follows_read already lets you read
-- the follows rows between you and anyone else, so no security definer is
-- needed. The comments policies use it too.
create function public.is_friend(other uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = (select auth.uid()) and f.followee_id = other
  ) and exists (
    select 1 from public.follows f
    where f.follower_id = other and f.followee_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated;

alter table public.reviews add column visibility text not null default 'friends'
  constraint reviews_visibility check (visibility in ('friends', 'public'));

drop policy reviews_read on public.reviews;
create policy reviews_read on public.reviews
for select to authenticated
using (
  (select auth.uid()) = user_id
  or visibility = 'public'
  or public.is_friend(user_id)
);
