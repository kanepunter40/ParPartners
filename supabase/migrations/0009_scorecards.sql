-- Scorecards: one per Par Partners round (shared by everyone in it) or solo (any course, any people).
-- Anyone on a card can enter any player's score. Pars come from OpenStreetMap
-- (scripts/import-holes.mjs) and players fill the gaps; corrections are kept per course.

create table course_holes (
  course_id   uuid not null references courses(id) on delete cascade,
  hole        smallint not null check (hole between 1 and 27),
  par         smallint not null check (par between 3 and 6),
  source      text not null default 'player' check (source in ('osm', 'player')),
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (course_id, hole)
);

create type scorecard_holes as enum ('18', 'front9', 'back9');

create table scorecards (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id),
  round_id    uuid unique references rounds(id) on delete set null,  -- null for solo cards
  holes       scorecard_holes not null default '18',
  played_at   timestamptz not null default now(),
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- A player on a card: an app user (profile_id) or a guest (name only).
-- The name is a snapshot so the card reads the same later.
create table scorecard_players (
  id            uuid primary key default gen_random_uuid(),
  scorecard_id  uuid not null references scorecards(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete set null,
  name          text not null check (char_length(name) between 1 and 60),
  position      smallint not null,
  unique (scorecard_id, profile_id)
);
create index scorecard_players_profile_idx on scorecard_players (profile_id);

create table scores (
  scorecard_player_id  uuid not null references scorecard_players(id) on delete cascade,
  hole                 smallint not null check (hole between 1 and 18),
  strokes              smallint not null check (strokes between 1 and 20),
  updated_by           uuid references profiles(id) on delete set null,
  updated_at           timestamptz not null default now(),
  primary key (scorecard_player_id, hole)
);

-- ---------------------------------------------------------------------------
-- Access: members of a card (its creator and any app user on it) see and edit it.
-- Reads use RLS; all writes go through the functions below.
-- ---------------------------------------------------------------------------
create function is_scorecard_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from scorecards where id = sid and created_by = auth.uid())
      or exists (select 1 from scorecard_players where scorecard_id = sid and profile_id = auth.uid());
$$;

alter table course_holes       enable row level security;
alter table scorecards         enable row level security;
alter table scorecard_players  enable row level security;
alter table scores             enable row level security;

create policy course_holes_read on course_holes for select to authenticated using (true);
create policy scorecards_read on scorecards for select to authenticated using (is_scorecard_member(id));
create policy scorecards_delete on scorecards for delete to authenticated using (created_by = auth.uid());
create policy scorecard_players_read on scorecard_players for select to authenticated using (is_scorecard_member(scorecard_id));
create policy scores_read on scores for select to authenticated
  using (exists (select 1 from scorecard_players sp where sp.id = scorecard_player_id and is_scorecard_member(sp.scorecard_id)));

revoke all on course_holes, scorecards, scorecard_players, scores from anon;

-- ---------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------

-- Adds the round's host and confirmed players who aren't on the card yet.
create function sync_round_scorecard_players(p_scorecard_id uuid, p_round_id uuid) returns void
language sql security definer set search_path = public as $$
  insert into scorecard_players (scorecard_id, profile_id, name, position)
  select p_scorecard_id, rp.player_id, p.display_name,
         coalesce((select max(position) from scorecard_players where scorecard_id = p_scorecard_id), 0)
           + row_number() over (order by rp.status = 'host' desc, rp.created_at)
  from round_players rp join profiles p on p.id = rp.player_id
  where rp.round_id = p_round_id and rp.status in ('host', 'confirmed')
  on conflict (scorecard_id, profile_id) do nothing;
$$;

-- Round card: returns the existing card (adding any new players), or creates one.
-- Pass p_holes = null to only open an existing card (returns null if there is none).
create function start_round_scorecard(p_round_id uuid, p_holes scorecard_holes) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  sid uuid;
begin
  select * into r from rounds where id = p_round_id;
  if not found then raise exception 'Round not available'; end if;
  if not exists (select 1 from round_players where round_id = p_round_id and player_id = auth.uid() and status in ('host', 'confirmed'))
    then raise exception 'Only players in this round can keep its scorecard'; end if;

  select id into sid from scorecards where round_id = p_round_id;
  if sid is null then
    if p_holes is null then return null; end if;
    insert into scorecards (course_id, round_id, holes, played_at, created_by)
    values (r.course_id, p_round_id, p_holes, r.tee_time, auth.uid())
    on conflict (round_id) do nothing  -- two players starting at the same moment
    returning id into sid;
    if sid is null then select id into sid from scorecards where round_id = p_round_id; end if;
  end if;

  perform sync_round_scorecard_players(sid, p_round_id);
  return sid;
end $$;

-- Solo card: you plus optional guests by name.
create function start_solo_scorecard(p_course_id uuid, p_holes scorecard_holes, p_guests text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  me text;
begin
  select display_name into me from profiles where id = auth.uid();
  if me is null then raise exception 'Finish your profile first'; end if;
  if coalesce(array_length(p_guests, 1), 0) > 7 then raise exception 'A card has at most 8 players'; end if;

  insert into scorecards (course_id, holes, created_by) values (p_course_id, p_holes, auth.uid()) returning id into sid;
  insert into scorecard_players (scorecard_id, profile_id, name, position) values (sid, auth.uid(), me, 1);
  insert into scorecard_players (scorecard_id, name, position)
  select sid, trim(g), 1 + ord from unnest(p_guests) with ordinality as t(g, ord) where trim(g) <> '';
  return sid;
end $$;

-- p_strokes null clears the hole.
create function set_score(p_scorecard_player_id uuid, p_hole int, p_strokes int) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  h scorecard_holes;
  first_hole int;
  last_hole int;
begin
  select sp.scorecard_id, s.holes into sid, h
    from scorecard_players sp join scorecards s on s.id = sp.scorecard_id
   where sp.id = p_scorecard_player_id;
  if sid is null or not is_scorecard_member(sid) then raise exception 'Scorecard not found'; end if;
  first_hole := case when h = 'back9' then 10 else 1 end;
  last_hole := case when h = 'front9' then 9 else 18 end;
  if p_hole not between first_hole and last_hole then raise exception 'Hole % is not on this card', p_hole; end if;

  if p_strokes is null then
    delete from scores where scorecard_player_id = p_scorecard_player_id and hole = p_hole;
  else
    insert into scores (scorecard_player_id, hole, strokes, updated_by)
    values (p_scorecard_player_id, p_hole, p_strokes, auth.uid())
    on conflict (scorecard_player_id, hole) do update
      set strokes = excluded.strokes, updated_by = excluded.updated_by, updated_at = now();
  end if;
end $$;

-- Players correct or fill in a par. Only people with a card on that course can.
create function set_hole_par(p_course_id uuid, p_hole int, p_par int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from scorecards s
    where s.course_id = p_course_id and is_scorecard_member(s.id)
  ) then raise exception 'Start a scorecard on this course first'; end if;

  insert into course_holes (course_id, hole, par, source, updated_by)
  values (p_course_id, p_hole, p_par, 'player', auth.uid())
  on conflict (course_id, hole) do update
    set par = excluded.par, source = 'player', updated_by = excluded.updated_by, updated_at = now();
end $$;

-- ---------------------------------------------------------------------------
-- History: my cards with my total and score vs par over the holes I've played.
-- A 9-hole course played as 18 reuses holes 1-9 for the pars of 10-18. Unknown par counts as 4.
-- ---------------------------------------------------------------------------
create function my_scorecards() returns table (
  id uuid, course_name text, played_at timestamptz, holes scorecard_holes,
  round_id uuid, strokes int, holes_played int, par_played int
)
language sql stable security invoker set search_path = public as $$
  select s.id, c.name, s.played_at, s.holes, s.round_id,
         coalesce(sum(sc.strokes), 0)::int,
         count(sc.hole)::int,
         coalesce(sum(coalesce(ch.par, ch9.par, 4)) filter (where sc.hole is not null), 0)::int
  from scorecards s
  join courses c on c.id = s.course_id
  join scorecard_players me on me.scorecard_id = s.id and me.profile_id = auth.uid()
  left join scores sc on sc.scorecard_player_id = me.id
  left join course_holes ch on ch.course_id = s.course_id and ch.hole = sc.hole
  left join course_holes ch9 on ch9.course_id = s.course_id and ch9.hole = sc.hole - 9
       and not exists (select 1 from course_holes x where x.course_id = s.course_id and x.hole > 9)
  group by s.id, c.name
  order by s.played_at desc;
$$;

-- Belt and braces in case default privileges differ (see 0004).
revoke execute on function is_scorecard_member(uuid), sync_round_scorecard_players(uuid, uuid),
  start_round_scorecard(uuid, scorecard_holes), start_solo_scorecard(uuid, scorecard_holes, text[]),
  set_score(uuid, int, int), set_hole_par(uuid, int, int), my_scorecards()
from public, anon;
revoke execute on function sync_round_scorecard_players(uuid, uuid) from authenticated;
