-- Test data for kanepunter40@gmail.com: 8 fake players around Golf Nippenburg, friendships,
-- open and full upcoming rounds, played rounds with scorecards, and notifications.
-- Not a migration. Fake rows use fixed ids so dummy_cleanup.sql can remove them:
--   players  d0000000-0000-4000-8000-0000000000NN   (emails dummy.*@parpartners.test, can't sign in)
--   rounds   d1000000-0000-4000-8000-0000000000NN
--   cards    d2000000-0000-4000-8000-0000000000NN
-- Run once in the SQL editor. Refuses to run twice.

do $$
declare
  kane uuid := (select id from auth.users where email = 'kanepunter40@gmail.com');
  today timestamptz := date_trunc('day', now());
  nippenburg   uuid := 'df358a25-7ba1-416c-af1e-233b77c2e1b2';
  wald_solitude uuid := 'ac252569-a8e1-4ed0-be96-fc19c63d795f';
  monrepos     uuid := '6505c8f8-2850-4261-a61d-9d93de21693b';
  neckartal    uuid := 'a1f30ce8-27d3-4b5d-acc6-eb555273169d';
  glc_stuttgart uuid := 'c8c08067-b987-4163-9eaf-b0b5ff31077b';
  sgc_solitude uuid := '7cadd24f-b8f7-43e6-9b68-ccfdb872b619';
  lena  uuid := 'd0000000-0000-4000-8000-000000000001';
  marco uuid := 'd0000000-0000-4000-8000-000000000002';
  jonas uuid := 'd0000000-0000-4000-8000-000000000003';
  sophie uuid := 'd0000000-0000-4000-8000-000000000004';
  tom   uuid := 'd0000000-0000-4000-8000-000000000005';
  aylin uuid := 'd0000000-0000-4000-8000-000000000006';
  david uuid := 'd0000000-0000-4000-8000-000000000007';
  mia   uuid := 'd0000000-0000-4000-8000-000000000008';
  sp record;
  h int;
  first_hole int;
  last_hole int;
  hole_par int;
begin
  if kane is null then raise exception 'No user kanepunter40@gmail.com'; end if;
  if exists (select 1 from profiles where id = lena) then raise exception 'Dummy data is already there'; end if;
  perform setseed(0.42);

  -- Players ---------------------------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
         '{"provider":"email","providers":["email"],"dummy":true}', jsonb_build_object('full_name', u.name),
         now() - interval '60 days', now(), '', '', '', ''
  from (values (lena, 'dummy.lena@parpartners.test', 'Lena Hoffmann'),
               (marco, 'dummy.marco@parpartners.test', 'Marco Rossi'),
               (jonas, 'dummy.jonas@parpartners.test', 'Jonas Weber'),
               (sophie, 'dummy.sophie@parpartners.test', 'Sophie Becker'),
               (tom, 'dummy.tom@parpartners.test', 'Tom Fischer'),
               (aylin, 'dummy.aylin@parpartners.test', 'Aylin Kaya'),
               (david, 'dummy.david@parpartners.test', 'David Klein'),
               (mia, 'dummy.mia@parpartners.test', 'Mia Schulz')) as u(id, email, name);

  insert into profiles (id, display_name, home_course_id, handicap_index, no_handicap, languages, play_times, round_length, vibe, onboarded, created_at) values
    (lena,   'Lena Hoffmann', nippenburg,    14.2, false, '{German,English}',         '{weekend,weekday_evening}', 'eighteen', 'relaxed',          true, now() - interval '60 days'),
    (marco,  'Marco Rossi',   monrepos,       9.8, false, '{Italian,German,English}', '{weekend}',                 'eighteen', 'competitive',      true, now() - interval '50 days'),
    (jonas,  'Jonas Weber',   neckartal,     21.5, false, '{German}',                 '{weekday_evening}',         'nine',     'relaxed',          true, now() - interval '45 days'),
    (sophie, 'Sophie Becker', wald_solitude,  5.4, false, '{German,English}',         '{weekday_morning,weekend}', 'eighteen', 'very_competitive', true, now() - interval '40 days'),
    (tom,    'Tom Fischer',   nippenburg,    28.0, false, '{German,English}',         '{anytime}',                 'either',   'relaxed',          true, now() - interval '20 days'),
    (aylin,  'Aylin Kaya',    glc_stuttgart, 17.1, false, '{German,Turkish,English}', '{weekend}',                 'either',   'competitive',      true, now() - interval '30 days'),
    (david,  'David Klein',   sgc_solitude,  11.3, false, '{English,German}',         '{weekday_morning}',         'eighteen', 'competitive',      true, now() - interval '25 days'),
    (mia,    'Mia Schulz',    monrepos,      null, true,  '{German}',                 '{weekend}',                 'nine',     'relaxed',          true, now() - interval '10 days');

  insert into profile_private (id, birth_year, gender, show_age_gender) values
    (lena, 1994, 'Woman', true), (marco, 1988, 'Man', true), (sophie, 1999, 'Woman', false),
    (david, 1979, 'Man', true), (aylin, 1991, 'Woman', true);

  -- Friendships -------------------------------------------------------------------------
  insert into friendships (requester_id, addressee_id, status, created_at, accepted_at) values
    (kane,  lena,   'accepted', now() - interval '31 days', now() - interval '30 days'),
    (marco, kane,   'accepted', now() - interval '15 days', now() - interval '14 days'),
    (kane,  jonas,  'accepted', now() - interval '6 days',  now() - interval '5 days'),
    (sophie, kane,  'accepted', now() - interval '1 day',   now() - interval '2 hours'),
    (tom,   kane,   'pending',  now() - interval '1 day',   null),   -- asks Kane
    (kane,  aylin,  'pending',  now() - interval '3 days',  null),   -- Kane asked
    (lena,  marco,  'accepted', now() - interval '2 days',  now() - interval '1 day'),
    (jonas, sophie, 'accepted', now() - interval '41 days', now() - interval '40 days');

  -- Rounds (the host is added as a player by the rounds_add_host trigger) -----------------
  insert into rounds (id, host_id, course_id, tee_time, max_players, visibility, approve_requests, notes, status, created_at) values
    ('d1000000-0000-4000-8000-000000000001', lena,   nippenburg,    today + interval '1 day 9 hours',          4, 'nearby', true,  'Relaxed 18, happy to walk.', 'open', now() - interval '3 days'),
    ('d1000000-0000-4000-8000-000000000002', marco,  monrepos,      today + interval '2 days 16 hours 30 minutes', 4, 'nearby', true,  'Walking, no buggy. Drinks after.', 'open', now() - interval '20 hours'),
    ('d1000000-0000-4000-8000-000000000003', david,  wald_solitude, today + interval '4 days 8 hours 10 minutes',  3, 'nearby', true,  null, 'open', now() - interval '5 hours'),
    ('d1000000-0000-4000-8000-000000000004', sophie, glc_stuttgart, today + interval '3 days 10 hours',        3, 'nearby', true,  'Quick pace please.', 'full', now() - interval '2 days'),
    ('d1000000-0000-4000-8000-000000000005', mia,    neckartal,     today + interval '6 days 17 hours',        4, 'nearby', false, '9 holes after work, beginners welcome.', 'open', now() - interval '1 day'),
    ('d1000000-0000-4000-8000-000000000006', kane,   nippenburg,    today + interval '5 days 7 hours 30 minutes', 4, 'nearby', true, null, 'open', now() - interval '2 days'),
    ('d1000000-0000-4000-8000-000000000007', aylin,  sgc_solitude,  today + interval '9 days 11 hours',        2, 'nearby', true,  'Looking for one partner, any handicap.', 'open', now() - interval '6 hours'),
    ('d1000000-0000-4000-8000-000000000008', lena,   nippenburg,    today - interval '6 days' + interval '10 hours', 4, 'nearby', true, null, 'played', now() - interval '12 days'),
    ('d1000000-0000-4000-8000-000000000009', jonas,  neckartal,     today - interval '3 days' + interval '17 hours', 4, 'nearby', true, null, 'played', now() - interval '8 days');

  insert into round_players (round_id, player_id, status, created_at) values
    ('d1000000-0000-4000-8000-000000000001', kane,   'confirmed', now() - interval '2 days'),
    ('d1000000-0000-4000-8000-000000000001', tom,    'confirmed', now() - interval '1 day'),
    ('d1000000-0000-4000-8000-000000000002', jonas,  'confirmed', now() - interval '10 hours'),
    ('d1000000-0000-4000-8000-000000000004', aylin,  'confirmed', now() - interval '1 day'),
    ('d1000000-0000-4000-8000-000000000004', mia,    'confirmed', now() - interval '20 hours'),
    ('d1000000-0000-4000-8000-000000000006', marco,  'confirmed', now() - interval '1 day'),
    ('d1000000-0000-4000-8000-000000000006', david,  'requested', now() - interval '3 hours'),
    ('d1000000-0000-4000-8000-000000000008', kane,   'confirmed', now() - interval '10 days'),
    ('d1000000-0000-4000-8000-000000000008', marco,  'confirmed', now() - interval '9 days'),
    ('d1000000-0000-4000-8000-000000000009', sophie, 'confirmed', now() - interval '7 days');

  -- Scorecards ------------------------------------------------------------------------------
  insert into scorecards (id, course_id, round_id, holes, played_at, created_by, created_at) values
    ('d2000000-0000-4000-8000-000000000001', nippenburg, 'd1000000-0000-4000-8000-000000000008', '18',     today - interval '6 days' + interval '10 hours', lena,  today - interval '6 days' + interval '10 hours'),
    ('d2000000-0000-4000-8000-000000000002', neckartal,  'd1000000-0000-4000-8000-000000000009', '18',     today - interval '3 days' + interval '17 hours', jonas, today - interval '3 days' + interval '17 hours'),
    ('d2000000-0000-4000-8000-000000000003', neckartal,  null,                                   '18',     today - interval '20 days' + interval '16 hours', jonas, today - interval '20 days' + interval '16 hours'),
    ('d2000000-0000-4000-8000-000000000004', monrepos,   null,                                   '18',     today - interval '12 days' + interval '9 hours', kane,  today - interval '12 days' + interval '9 hours'),
    ('d2000000-0000-4000-8000-000000000005', monrepos,   null,                                   'front9', today - interval '1 day' + interval '18 hours', marco, today - interval '1 day' + interval '18 hours'),
    ('d2000000-0000-4000-8000-000000000006', nippenburg, null,                                   '18',     today - interval '25 days' + interval '8 hours', kane,  today - interval '25 days' + interval '8 hours');

  -- (card, player, guest name, position, handicap used for the scores, extra strokes)
  create temp table _dummy_sp (card uuid, profile uuid, name text, pos int, hcp numeric, extra int) on commit drop;
  insert into _dummy_sp values
    ('d2000000-0000-4000-8000-000000000001', lena,  'Lena Hoffmann', 1, 14, 0),
    ('d2000000-0000-4000-8000-000000000001', kane,  'Kane Punter',   2, 18, 0),
    ('d2000000-0000-4000-8000-000000000001', marco, 'Marco Rossi',   3, 10, 0),
    ('d2000000-0000-4000-8000-000000000002', jonas, 'Jonas Weber',   1, 16, 0),   -- Jonas's personal best
    ('d2000000-0000-4000-8000-000000000002', sophie,'Sophie Becker', 2,  5, 0),
    ('d2000000-0000-4000-8000-000000000003', jonas, 'Jonas Weber',   1, 22, 6),
    ('d2000000-0000-4000-8000-000000000004', kane,  'Kane Punter',   1, 18, 0),
    ('d2000000-0000-4000-8000-000000000004', null,  'Dad',           2, 24, 0),
    ('d2000000-0000-4000-8000-000000000005', marco, 'Marco Rossi',   1, 10, 0),
    ('d2000000-0000-4000-8000-000000000005', null,  'Giulia',        2, 30, 0),
    ('d2000000-0000-4000-8000-000000000006', kane,  'Kane Punter',   1, 20, 3),
    ('d2000000-0000-4000-8000-000000000006', lena,  'Lena Hoffmann', 2, 14, 0);

  for sp in
    insert into scorecard_players (scorecard_id, profile_id, name, position)
    select card, profile, name, pos from _dummy_sp
    returning id, scorecard_id
  loop
    select case s.holes when 'back9' then 10 else 1 end, case s.holes when 'front9' then 9 else 18 end
      into first_hole, last_hole from scorecards s where s.id = sp.scorecard_id;
    for h in first_hole..last_hole loop
      select coalesce((select par from course_holes ch join scorecards s on s.course_id = ch.course_id
                       where s.id = sp.scorecard_id and ch.hole = h), 4) into hole_par;
      insert into scores (scorecard_player_id, hole, strokes, updated_at)
      select sp.id, h,
             least(20, greatest(1, hole_par + floor(d.hcp / 18 + random() * 2 - 0.5)::int + case when h <= d.extra then 1 else 0 end)),
             s.played_at + make_interval(mins => h * 14)
      from _dummy_sp d
      join scorecard_players p on p.id = sp.id and p.scorecard_id = d.card and p.position = d.pos
      join scorecards s on s.id = d.card;
    end loop;
  end loop;

  -- Notifications for Kane ------------------------------------------------------------------
  insert into notifications (user_id, type, round_id, actor_id, read_at, created_at) values
    (kane, 'request_received', 'd1000000-0000-4000-8000-000000000006', david,  null, now() - interval '3 hours'),
    (kane, 'friend_accepted',  null,                                   sophie, null, now() - interval '2 hours'),
    (kane, 'friend_request',   null,                                   tom,    null, now() - interval '1 day'),
    (kane, 'player_joined',    'd1000000-0000-4000-8000-000000000006', marco,  now() - interval '20 hours', now() - interval '1 day'),
    (kane, 'request_accepted', 'd1000000-0000-4000-8000-000000000001', lena,   now() - interval '1 day', now() - interval '2 days');
end $$;
