-- Friends (request and accept) and the Home feed.
-- One row per pair of players. Rows are never removed when a request is declined or a friend
-- is removed: the status changes instead, which also stops repeat requests from spamming.

create table friendships (
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on friendships (addressee_id);

alter table friendships enable row level security;
create policy friendships_read on friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
revoke all on friendships from anon;

-- Sends a request, or accepts theirs if they already asked. Returns 'pending' or 'accepted'.
-- A request the other player declined keeps looking pending to the sender, with no new notification.
create function send_friend_request(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  f friendships;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user = me then raise exception 'You can''t add yourself'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'Player not found'; end if;

  select * into f from friendships
   where least(requester_id, addressee_id) = least(me, p_user)
     and greatest(requester_id, addressee_id) = greatest(me, p_user)
   for update;

  if not found then
    insert into friendships (requester_id, addressee_id) values (me, p_user);
    insert into notifications (user_id, type, actor_id) values (p_user, 'friend_request', me);
    return 'pending';
  end if;

  if f.status = 'accepted' then return 'accepted'; end if;

  if f.status = 'pending' and f.addressee_id = me then
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = f.requester_id and addressee_id = f.addressee_id;
    insert into notifications (user_id, type, actor_id) values (p_user, 'friend_accepted', me);
    return 'accepted';
  end if;

  if f.status = 'pending' or (f.status = 'declined' and f.requester_id = me) then
    return 'pending';
  end if;

  -- Removed earlier, or I declined them before and now want to add them: a fresh request from me.
  update friendships
     set requester_id = me, addressee_id = p_user, status = 'pending', created_at = now(), accepted_at = null
   where requester_id = f.requester_id and addressee_id = f.addressee_id;
  insert into notifications (user_id, type, actor_id) values (p_user, 'friend_request', me);
  return 'pending';
end $$;

create function respond_friend_request(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update friendships
     set status = case when p_accept then 'accepted' else 'declined' end,
         accepted_at = case when p_accept then now() end
   where requester_id = p_user and addressee_id = auth.uid() and status = 'pending';
  if found and p_accept then
    insert into notifications (user_id, type, actor_id) values (p_user, 'friend_accepted', auth.uid());
  end if;
end $$;

-- Unfriends, or withdraws a request I sent. Silent: nobody is notified.
create function remove_friend(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update friendships set status = 'removed', accepted_at = null
   where least(requester_id, addressee_id) = least(auth.uid(), p_user)
     and greatest(requester_id, addressee_id) = greatest(auth.uid(), p_user)
     and (status = 'accepted' or (status = 'pending' and requester_id = auth.uid()));
end $$;

-- The Home feed: my updates and my friends'. Newest first; pass the oldest `at` as p_before for more.
--   scorecard     a finished card (personal_best when it beats that player's earlier 18-hole cards)
--   round_posted  a friend hosts an upcoming round open to everyone nearby
--   round_joined  a friend joined such a round
--   new_friend    two players in my circle became friends
create function home_feed(p_before timestamptz default null, p_limit int default 30)
returns table (
  kind text, at timestamptz,
  actor_id uuid, actor_name text, other_id uuid, other_name text,
  round_id uuid, scorecard_id uuid, course_name text, tee_time timestamptz, spots_left int,
  holes scorecard_holes, strokes int, to_par int, personal_best boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  friends as (
    select case when f.requester_id = me.id then f.addressee_id else f.requester_id end as id
    from friendships f, me
    where f.status = 'accepted' and me.id in (f.requester_id, f.addressee_id)
  ),
  circle as (select id from friends union select id from me),
  cards as (
    select sp.profile_id, p.display_name, s.id as sid, s.holes, c.name as course, s.round_id,
           sum(sc.strokes)::int as strokes,
           (sum(sc.strokes) - sum(coalesce(ch.par, ch9.par, 4)))::int as to_par,
           max(sc.updated_at) as at
    from scorecard_players sp
    join profiles p on p.id = sp.profile_id
    join scorecards s on s.id = sp.scorecard_id
    join courses c on c.id = s.course_id
    join scores sc on sc.scorecard_player_id = sp.id
    left join course_holes ch on ch.course_id = s.course_id and ch.hole = sc.hole
    left join course_holes ch9 on ch9.course_id = s.course_id and ch9.hole = sc.hole - 9
         and not exists (select 1 from course_holes x where x.course_id = s.course_id and x.hole > 9)
    where sp.profile_id in (select id from circle)
    group by sp.profile_id, p.display_name, s.id, c.name
    having count(sc.hole) = case when s.holes = '18' then 18 else 9 end
  ),
  ranked as (
    select *, min(strokes) filter (where holes = '18') over (
             partition by profile_id order by at rows between unbounded preceding and 1 preceding) as prev_best
    from cards
  ),
  open_rounds as (
    select r.id, r.host_id, r.created_at, r.tee_time, c.name as course,
           r.max_players - (select count(*) from round_players x
                             where x.round_id = r.id and x.status in ('host', 'confirmed'))::int as spots_left
    from rounds r join courses c on c.id = r.course_id
    where r.visibility = 'nearby' and r.status in ('open', 'full') and r.tee_time > now()
  ),
  events as (
    select 'scorecard'::text as kind, k.at, k.profile_id as actor_id, k.display_name as actor_name,
           null::uuid as other_id, null::text as other_name,
           k.round_id, k.sid as scorecard_id, k.course as course_name, null::timestamptz as tee_time, null::int as spots_left,
           k.holes, k.strokes, k.to_par,
           (k.holes = '18' and k.prev_best is not null and k.strokes < k.prev_best) as personal_best
    from ranked k
    union all
    select 'round_posted', o.created_at, o.host_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false
    from open_rounds o join profiles p on p.id = o.host_id
    where o.host_id in (select id from friends)
    union all
    select 'round_joined', rp.created_at, rp.player_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false
    from round_players rp
    join open_rounds o on o.id = rp.round_id
    join profiles p on p.id = rp.player_id
    where rp.status = 'confirmed' and rp.player_id in (select id from friends)
    union all
    select 'new_friend', f.accepted_at,
           a.id, a.display_name, b.id, b.display_name,
           null, null, null, null, null, null, null, null, false
    from friendships f
    cross join me
    -- "You and Ben", or "Ben and Chris" with my friend first
    cross join lateral (select case when me.id in (f.requester_id, f.addressee_id) then me.id
                                    when f.addressee_id in (select id from friends) then f.addressee_id
                                    else f.requester_id end as actor) pick
    join profiles a on a.id = pick.actor
    join profiles b on b.id = case when pick.actor = f.requester_id then f.addressee_id else f.requester_id end
    where f.status = 'accepted'
      and (f.requester_id in (select id from circle) or f.addressee_id in (select id from circle))
  )
  select * from events
  where at < coalesce(p_before, 'infinity'::timestamptz)
  order by at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function send_friend_request(uuid), respond_friend_request(uuid, boolean),
  remove_friend(uuid), home_feed(timestamptz, int) from public, anon;
grant execute on function send_friend_request(uuid), respond_friend_request(uuid, boolean),
  remove_friend(uuid), home_feed(timestamptz, int) to authenticated;
