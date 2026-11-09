-- More test data for kanepunter40@gmail.com, on top of dummy_data.sql (run that first).
-- Exercises the features from migrations 0019-0024: a full round Kane hosts with a waitlist, an
-- invite-only round with invited players, Kane waitlisted / invited / moved in, busy round chats,
-- "I'm free" posts, search alerts, open rounds in every format for Find, and a longer scorecard
-- history (match play, best ball, Stableford, improving scores for the trend graph).
-- Same fixed-id scheme, so dummy_cleanup.sql removes it all:
--   players  d0000000-0000-4000-8000-0000000000NN   (09-0e here)
--   rounds   d1000000-0000-4000-8000-0000000000NN   (10-1c here)
--   cards    d2000000-0000-4000-8000-0000000000NN   (07-12 here)
--   Kane's alerts d3000000-..., Kane's "I'm free" post d5000000-...
-- Push and chat triggers are paused while it runs, so Kane's phone doesn't get dozens of pushes.
-- Run once in the SQL editor. Refuses to run twice.

do $$
declare
  kane uuid := (select id from auth.users where email = 'kanepunter40@gmail.com');
  today timestamptz := date_trunc('day', now());
  berlin_today date := (now() at time zone 'Europe/Berlin')::date;
  nippenburg    uuid := 'df358a25-7ba1-416c-af1e-233b77c2e1b2';
  wald_solitude uuid := 'ac252569-a8e1-4ed0-be96-fc19c63d795f';
  monrepos      uuid := '6505c8f8-2850-4261-a61d-9d93de21693b';
  neckartal     uuid := 'a1f30ce8-27d3-4b5d-acc6-eb555273169d';
  glc_stuttgart uuid := 'c8c08067-b987-4163-9eaf-b0b5ff31077b';
  sgc_solitude  uuid := '7cadd24f-b8f7-43e6-9b68-ccfdb872b619';
  -- from dummy_data.sql
  lena   uuid := 'd0000000-0000-4000-8000-000000000001';
  marco  uuid := 'd0000000-0000-4000-8000-000000000002';
  jonas  uuid := 'd0000000-0000-4000-8000-000000000003';
  sophie uuid := 'd0000000-0000-4000-8000-000000000004';
  tom    uuid := 'd0000000-0000-4000-8000-000000000005';
  aylin  uuid := 'd0000000-0000-4000-8000-000000000006';
  david  uuid := 'd0000000-0000-4000-8000-000000000007';
  mia    uuid := 'd0000000-0000-4000-8000-000000000008';
  -- new
  felix  uuid := 'd0000000-0000-4000-8000-000000000009';
  hannah uuid := 'd0000000-0000-4000-8000-00000000000a';
  luca   uuid := 'd0000000-0000-4000-8000-00000000000b';
  emma   uuid := 'd0000000-0000-4000-8000-00000000000c';
  noah   uuid := 'd0000000-0000-4000-8000-00000000000d';
  clara  uuid := 'd0000000-0000-4000-8000-00000000000e';
  r_kane_full    uuid := 'd1000000-0000-4000-8000-000000000010';
  r_kane_invite  uuid := 'd1000000-0000-4000-8000-000000000011';
  r_emma_full    uuid := 'd1000000-0000-4000-8000-000000000012';
  r_luca_invites uuid := 'd1000000-0000-4000-8000-000000000013';
  r_felix_scram  uuid := 'd1000000-0000-4000-8000-000000000014';
  r_noah         uuid := 'd1000000-0000-4000-8000-000000000015';
  r_hannah       uuid := 'd1000000-0000-4000-8000-000000000016';
  r_clara        uuid := 'd1000000-0000-4000-8000-000000000017';
  r_jonas_full   uuid := 'd1000000-0000-4000-8000-000000000018';
  r_past_stable  uuid := 'd1000000-0000-4000-8000-000000000019';
  r_past_match   uuid := 'd1000000-0000-4000-8000-00000000001a';
  r_past_bestb   uuid := 'd1000000-0000-4000-8000-00000000001b';
  r_past_stroke  uuid := 'd1000000-0000-4000-8000-00000000001c';
  sp record;
  h int;
  first_hole int;
  last_hole int;
  hole_par int;
begin
  if kane is null then raise exception 'No user kanepunter40@gmail.com'; end if;
  if not exists (select 1 from profiles where id = lena) then raise exception 'Run dummy_data.sql first'; end if;
  if exists (select 1 from profiles where id = felix) then raise exception 'This extra dummy data is already there'; end if;
  perform setseed(0.17);

  alter table notifications disable trigger notifications_send_push;
  alter table rounds disable trigger rounds_notify_search_alerts;
  alter table round_messages disable trigger round_messages_rate;
  alter table round_messages disable trigger round_messages_notify;

  -- Players ---------------------------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
         '{"provider":"email","providers":["email"],"dummy":true}', jsonb_build_object('full_name', u.name),
         now() - interval '45 days', now(), '', '', '', ''
  from (values (felix,  'dummy.felix@parpartners.test',  'Felix Wagner'),
               (hannah, 'dummy.hannah@parpartners.test', 'Hannah Müller'),
               (luca,   'dummy.luca@parpartners.test',   'Luca Bianchi'),
               (emma,   'dummy.emma@parpartners.test',   'Emma Schneider'),
               (noah,   'dummy.noah@parpartners.test',   'Noah Braun'),
               (clara,  'dummy.clara@parpartners.test',  'Clara Wolf')) as u(id, email, name);

  insert into profiles (id, display_name, home_course_id, handicap_index, no_handicap, languages, play_times, round_length, vibe, onboarded, created_at) values
    (felix,  'Felix Wagner',   nippenburg,    12.6, false, '{German,English}',         '{weekend,weekday_morning}', 'eighteen', 'competitive',      true, now() - interval '45 days'),
    (hannah, 'Hannah Müller',  monrepos,      19.4, false, '{German}',                 '{weekend}',                 'either',   'relaxed',          true, now() - interval '40 days'),
    (luca,   'Luca Bianchi',   sgc_solitude,   7.2, false, '{Italian,English,German}', '{weekday_evening,weekend}', 'eighteen', 'very_competitive', true, now() - interval '38 days'),
    (emma,   'Emma Schneider', neckartal,     24.8, false, '{German,English}',         '{weekday_evening}',         'nine',     'relaxed',          true, now() - interval '30 days'),
    (noah,   'Noah Braun',     glc_stuttgart,  3.1, false, '{German,English}',         '{weekday_morning}',         'eighteen', 'very_competitive', true, now() - interval '22 days'),
    (clara,  'Clara Wolf',     nippenburg,    32.0, false, '{German}',                 '{anytime}',                 'either',   'relaxed',          true, now() - interval '9 days');

  insert into profile_private (id, birth_year, gender, show_age_gender) values
    (felix, 1990, 'Man', true), (hannah, 1985, 'Woman', true), (luca, 1996, 'Man', true),
    (emma, 2001, 'Woman', false), (noah, 1983, 'Man', true), (clara, 1972, 'Woman', true);

  -- Friendships -------------------------------------------------------------------------
  insert into friendships (requester_id, addressee_id, status, created_at, accepted_at) values
    (kane,   felix,  'accepted', now() - interval '40 days', now() - interval '39 days'),
    (hannah, kane,   'accepted', now() - interval '33 days', now() - interval '2 days'),
    (kane,   luca,   'accepted', now() - interval '22 days', now() - interval '21 days'),
    (emma,   kane,   'pending',  now() - interval '6 hours', null),   -- asks Kane
    (felix,  lena,   'accepted', now() - interval '20 days', now() - interval '19 days'),
    (noah,   sophie, 'accepted', now() - interval '15 days', now() - interval '14 days'),
    (luca,   marco,  'accepted', now() - interval '12 days', now() - interval '12 days');

  -- Rounds (hosts are added as players by the rounds_add_host trigger) -----------------
  -- Tee times are UTC: 08:30 UTC is 09:30 in Germany in winter.
  insert into rounds (id, host_id, course_id, tee_time, max_players, visibility, approve_requests, notes, status, format, created_at) values
    (r_kane_full,    kane,   nippenburg,    today + interval '2 days 8 hours 30 minutes',  3, 'nearby',      false, 'Stableford, walking. Coffee at the clubhouse from 9.', 'full', 'stableford', now() - interval '4 days'),
    (r_kane_invite,  kane,   monrepos,      today + interval '6 days 12 hours',            4, 'invite_only', false, 'Best ball, Kane & Luca against whoever is brave.',    'open', 'best_ball',  now() - interval '1 day'),
    (r_emma_full,    emma,   neckartal,     today + interval '3 days 15 hours',            2, 'nearby',      false, '9 holes after work.',                                  'full', 'casual',     now() - interval '2 days'),
    (r_luca_invites, luca,   sgc_solitude,  today + interval '4 days 9 hours',             4, 'nearby',      false, 'Proper strokeplay, we keep a card.',                   'open', 'strokeplay', now() - interval '3 days'),
    (r_felix_scram,  felix,  nippenburg,    today + interval '1 day 13 hours',             4, 'nearby',      false, 'Fun scramble, all levels.',                            'full', 'scramble',   now() - interval '5 days'),
    (r_noah,         noah,   glc_stuttgart, today + interval '5 days 8 hours',             4, 'nearby',      false, 'Match play, fast pace please.',                        'open', 'match_play', now() - interval '7 hours'),
    (r_hannah,       hannah, monrepos,      today + interval '8 days 10 hours 30 minutes', 3, 'nearby',      false, null,                                                   'open', 'stableford', now() - interval '40 minutes'),
    (r_clara,        clara,  nippenburg,    today + interval '10 days 14 hours',           4, 'nearby',      false, 'Still a beginner, be nice!',                           'open', 'casual',     now() - interval '1 day'),
    (r_jonas_full,   jonas,  neckartal,     today + interval '2 days 16 hours',            2, 'nearby',      false, null,                                                   'full', 'casual',     now() - interval '2 days'),
    (r_past_stable,  felix,  nippenburg,    today - interval '9 days' + interval '9 hours',   4, 'nearby', false, null, 'played', 'stableford', now() - interval '15 days'),
    (r_past_match,   kane,   monrepos,      today - interval '16 days' + interval '8 hours',  2, 'nearby', false, null, 'played', 'match_play', now() - interval '20 days'),
    (r_past_bestb,   luca,   sgc_solitude,  today - interval '21 days' + interval '10 hours', 4, 'nearby', false, null, 'played', 'best_ball',  now() - interval '26 days'),
    (r_past_stroke,  hannah, monrepos,      today - interval '32 days' + interval '11 hours', 4, 'nearby', false, null, 'played', 'strokeplay', now() - interval '36 days');

  insert into round_players (round_id, player_id, status, created_at) values
    -- Kane's full round: Felix and Lena in, Hannah then Noah waiting
    (r_kane_full,    felix,  'confirmed',  now() - interval '3 days'),
    (r_kane_full,    lena,   'confirmed',  now() - interval '2 days'),
    (r_kane_full,    hannah, 'waitlisted', now() - interval '5 hours'),
    (r_kane_full,    noah,   'waitlisted', now() - interval '2 hours'),
    -- Kane's invite-only round: Luca in, Sophie and Clara invited from Free to play
    (r_kane_invite,  luca,   'confirmed',  now() - interval '20 hours'),
    (r_kane_invite,  sophie, 'invited',    now() - interval '6 hours'),
    (r_kane_invite,  clara,  'invited',    now() - interval '3 hours'),
    -- Emma's full round: Kane is first on the waitlist
    (r_emma_full,    hannah, 'confirmed',  now() - interval '1 day'),
    (r_emma_full,    kane,   'waitlisted', now() - interval '4 hours'),
    (r_emma_full,    tom,    'waitlisted', now() - interval '1 hour'),
    -- Luca invited Kane
    (r_luca_invites, noah,   'confirmed',  now() - interval '2 days'),
    (r_luca_invites, kane,   'invited',    now() - interval '1 hour'),
    -- Felix's scramble: Kane moved in from the waitlist
    (r_felix_scram,  clara,  'confirmed',  now() - interval '4 days'),
    (r_felix_scram,  aylin,  'confirmed',  now() - interval '3 days'),
    (r_felix_scram,  kane,   'confirmed',  now() - interval '3 hours'),
    (r_noah,         sophie, 'confirmed',  now() - interval '5 hours'),
    (r_jonas_full,   emma,   'confirmed',  now() - interval '1 day'),
    -- Played
    (r_past_stable,  kane,   'confirmed',  now() - interval '14 days'),
    (r_past_stable,  lena,   'confirmed',  now() - interval '13 days'),
    (r_past_stable,  clara,  'confirmed',  now() - interval '12 days'),
    (r_past_match,   marco,  'confirmed',  now() - interval '19 days'),
    (r_past_bestb,   kane,   'confirmed',  now() - interval '25 days'),
    (r_past_bestb,   noah,   'confirmed',  now() - interval '25 days'),
    (r_past_bestb,   hannah, 'confirmed',  now() - interval '24 days'),
    (r_past_stroke,  kane,   'confirmed',  now() - interval '35 days');

  -- Round chats -------------------------------------------------------------------------
  insert into round_messages (round_id, sender_id, body, created_at) values
    -- Kane's round with Marco (Kane already said "Hello")
    ('d1000000-0000-4000-8000-000000000006', marco, 'Hi Kane, see you there!', now() - interval '10 minutes'),
    ('d1000000-0000-4000-8000-000000000006', marco, 'Shall we meet at the range at 8? I need a few balls to wake up.', now() - interval '9 minutes'),
    -- David's round (Kane already said "Hey")
    ('d1000000-0000-4000-8000-000000000003', david, 'Hey Kane! Looking forward to it.', now() - interval '6 minutes'),
    ('d1000000-0000-4000-8000-000000000003', david, 'Forecast says dry but cold, bring layers.', now() - interval '5 minutes'),
    -- Kane's full Stableford round
    (r_kane_full, kane,  'Welcome both! Stableford, so no stress if a hole goes wrong.', now() - interval '2 days'),
    (r_kane_full, felix, 'Perfect, my driver and I are not on speaking terms right now 😅', now() - interval '2 days' + interval '20 minutes'),
    (r_kane_full, lena,  'Are we walking or taking carts?', now() - interval '1 day 3 hours'),
    (r_kane_full, kane,  'Walking if the weather holds. I can bring a spare push trolley.', now() - interval '1 day 2 hours'),
    (r_kane_full, lena,  'Great, thanks!', now() - interval '1 day 2 hours' + interval '4 minutes'),
    (r_kane_full, felix, 'Coffee at 9 then. First round is on whoever has the highest score 😄', now() - interval '3 hours'),
    -- Felix's scramble
    (r_felix_scram, felix, 'Team scramble: Clara and Aylin vs Kane and me. Sound fair?', now() - interval '2 days'),
    (r_felix_scram, clara, 'Fine by me, just don''t expect long drives from me!', now() - interval '2 days' + interval '15 minutes'),
    (r_felix_scram, aylin, 'We''ll be fine Clara, scramble is all about the short game.', now() - interval '2 days' + interval '40 minutes'),
    (r_felix_scram, kane,  'Just got in off the waitlist, thanks for the spot!', now() - interval '2 hours 50 minutes'),
    (r_felix_scram, felix, 'Welcome Kane 👋 Tee at 14:00, meet 13:30 at the first tee.', now() - interval '2 hours 30 minutes'),
    (r_felix_scram, clara, 'Who''s bringing the scramble tees? I only have the short ones.', now() - interval '15 minutes'),
    -- Kane's best ball round
    (r_kane_invite, luca, 'Invited two from Free to play? Nice, hope they say yes.', now() - interval '2 hours'),
    (r_kane_invite, kane, 'Fingers crossed. Otherwise it''s a 1-on-1 and you''re buying.', now() - interval '1 hour 45 minutes');

  -- "I'm free" posts (centre = a course, named after its town) --------------------------
  insert into availability (user_id, day, part_of_day, centre, place_name, radius_km, note, created_at)
  select a.uid, berlin_today + a.days_ahead, a.part, c.location, a.place, a.radius, a.note, now() - a.ago
  from (values
    (tom,   1, 'morning',   nippenburg,    'Ditzingen',   25, 'Happy to walk, 18 holes.',        interval '3 hours'),
    (aylin, 3, 'any',       glc_stuttgart, 'Stuttgart',   30, null,                              interval '1 day'),
    (clara, 5, 'afternoon', nippenburg,    'Schwieberdingen', 15, 'Beginner, looking for patient people.', interval '20 hours'),
    (noah,  2, 'morning',   glc_stuttgart, 'Stuttgart',   50, 'Early tee times preferred.',      interval '6 hours'),
    (emma,  6, 'evening',   neckartal,     'Remseck',     20, '9 holes after work.',             interval '2 days'),
    (mia,   4, 'any',       monrepos,      'Ludwigsburg', 25, null,                              interval '1 day'),
    (david, 7, 'morning',   sgc_solitude,  'Leonberg',    40, 'Any course in the area.',         interval '5 hours'),
    (sophie,9, 'afternoon', wald_solitude, 'Stuttgart-West', 25, null,                           interval '30 minutes')
  ) as a(uid, days_ahead, part, course, place, radius, note, ago)
  join courses c on c.id = a.course;

  insert into availability (id, user_id, day, part_of_day, centre, place_name, radius_km, note)
  select 'd5000000-0000-4000-8000-000000000001', kane, berlin_today + 12, 'any', c.location, 'Ditzingen', 50, 'Free all day, any format.'
  from courses c where c.id = nippenburg;

  -- Kane's alerts -----------------------------------------------------------------------
  insert into search_alerts (id, user_id, course_id, centre, place_name, radius_km, days, format, created_at)
  select 'd3000000-0000-4000-8000-000000000001', kane, null, c.location, 'Golf Nippenburg', 25, 'weekend', null, now() - interval '3 days'
  from courses c where c.id = nippenburg;
  insert into search_alerts (id, user_id, course_id, centre, place_name, radius_km, days, format, created_at) values
    ('d3000000-0000-4000-8000-000000000002', kane, monrepos, null, null, null, 'any', 'stableford', now() - interval '1 day');

  -- Scorecards ------------------------------------------------------------------------------
  insert into scorecards (id, course_id, round_id, holes, played_at, created_by, format, created_at) values
    ('d2000000-0000-4000-8000-000000000007', nippenburg,    r_past_stable, '18', today - interval '9 days' + interval '9 hours',   felix, null,         today - interval '9 days' + interval '9 hours'),
    ('d2000000-0000-4000-8000-000000000008', monrepos,      r_past_match,  '18', today - interval '16 days' + interval '8 hours',  kane,  null,         today - interval '16 days' + interval '8 hours'),
    ('d2000000-0000-4000-8000-000000000009', sgc_solitude,  r_past_bestb,  '18', today - interval '21 days' + interval '10 hours', luca,  null,         today - interval '21 days' + interval '10 hours'),
    ('d2000000-0000-4000-8000-00000000000a', monrepos,      r_past_stroke, '18', today - interval '32 days' + interval '11 hours', hannah, null,        today - interval '32 days' + interval '11 hours'),
    ('d2000000-0000-4000-8000-00000000000b', nippenburg,    null, '18',     today - interval '40 days' + interval '9 hours',  kane, 'stableford', today - interval '40 days' + interval '9 hours'),
    ('d2000000-0000-4000-8000-00000000000c', neckartal,     null, '18',     today - interval '47 days' + interval '14 hours', kane, null,         today - interval '47 days' + interval '14 hours'),
    ('d2000000-0000-4000-8000-00000000000d', glc_stuttgart, null, '18',     today - interval '55 days' + interval '10 hours', kane, null,         today - interval '55 days' + interval '10 hours'),
    ('d2000000-0000-4000-8000-00000000000e', nippenburg,    null, '18',     today - interval '62 days' + interval '8 hours',  kane, null,         today - interval '62 days' + interval '8 hours'),
    ('d2000000-0000-4000-8000-00000000000f', wald_solitude, null, '18',     today - interval '70 days' + interval '9 hours',  kane, null,         today - interval '70 days' + interval '9 hours'),
    ('d2000000-0000-4000-8000-000000000010', monrepos,      null, 'front9', today - interval '4 days' + interval '16 hours',  kane, null,         today - interval '4 days' + interval '16 hours'),
    ('d2000000-0000-4000-8000-000000000011', neckartal,     null, '18',     today - interval '78 days' + interval '13 hours', kane, null,         today - interval '78 days' + interval '13 hours'),
    ('d2000000-0000-4000-8000-000000000012', nippenburg,    null, '18',     today - interval '85 days' + interval '9 hours',  kane, null,         today - interval '85 days' + interval '9 hours');

  -- (card, player, name, position, handicap the scores are drawn around, extra strokes on the first holes)
  -- Kane's handicap drifts from ~24 (85 days ago) to ~15 (recent), so the trend graph points down.
  create temp table _dummy_sp2 (card uuid, profile uuid, name text, pos int, hcp numeric, extra int) on commit drop;
  insert into _dummy_sp2 values
    ('d2000000-0000-4000-8000-000000000007', felix,  'Felix Wagner',   1, 13, 0),
    ('d2000000-0000-4000-8000-000000000007', kane,   'Kane Punter',    2, 15, 0),
    ('d2000000-0000-4000-8000-000000000007', lena,   'Lena Hoffmann',  3, 14, 0),
    ('d2000000-0000-4000-8000-000000000007', clara,  'Clara Wolf',     4, 32, 0),
    ('d2000000-0000-4000-8000-000000000008', kane,   'Kane Punter',    1, 16, 0),
    ('d2000000-0000-4000-8000-000000000008', marco,  'Marco Rossi',    2, 10, 0),
    ('d2000000-0000-4000-8000-000000000009', luca,   'Luca Bianchi',   1,  7, 0),
    ('d2000000-0000-4000-8000-000000000009', kane,   'Kane Punter',    2, 17, 0),
    ('d2000000-0000-4000-8000-000000000009', noah,   'Noah Braun',     3,  3, 0),
    ('d2000000-0000-4000-8000-000000000009', hannah, 'Hannah Müller',  4, 19, 0),
    ('d2000000-0000-4000-8000-00000000000a', hannah, 'Hannah Müller',  1, 19, 0),
    ('d2000000-0000-4000-8000-00000000000a', kane,   'Kane Punter',    2, 18, 0),
    ('d2000000-0000-4000-8000-00000000000a', null,   'Ben',            3, 26, 0),
    ('d2000000-0000-4000-8000-00000000000b', kane,   'Kane Punter',    1, 19, 0),
    ('d2000000-0000-4000-8000-00000000000c', kane,   'Kane Punter',    1, 20, 2),
    ('d2000000-0000-4000-8000-00000000000c', null,   'Dad',            2, 24, 0),
    ('d2000000-0000-4000-8000-00000000000d', kane,   'Kane Punter',    1, 21, 2),
    ('d2000000-0000-4000-8000-00000000000e', kane,   'Kane Punter',    1, 22, 3),
    ('d2000000-0000-4000-8000-00000000000f', kane,   'Kane Punter',    1, 22, 4),
    ('d2000000-0000-4000-8000-000000000010', kane,   'Kane Punter',    1, 16, 0),
    ('d2000000-0000-4000-8000-000000000010', null,   'Sam',            2, 28, 0),
    ('d2000000-0000-4000-8000-000000000011', kane,   'Kane Punter',    1, 23, 4),
    ('d2000000-0000-4000-8000-000000000012', kane,   'Kane Punter',    1, 24, 5);

  for sp in
    insert into scorecard_players (scorecard_id, profile_id, name, position)
    select card, profile, name, pos from _dummy_sp2
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
      from _dummy_sp2 d
      join scorecard_players p on p.id = sp.id and p.scorecard_id = d.card and p.position = d.pos
      join scorecards s on s.id = d.card;
    end loop;
  end loop;

  -- Notifications for Kane ------------------------------------------------------------------
  insert into notifications (user_id, type, round_id, actor_id, detail, read_at, created_at) values
    (kane, 'round_message',     'd1000000-0000-4000-8000-000000000003', david, 'Hey Kane! Looking forward to it.', null, now() - interval '6 minutes'),
    (kane, 'round_message',     'd1000000-0000-4000-8000-000000000006', marco, 'Hi Kane, see you there!', null, now() - interval '10 minutes'),
    (kane, 'round_message',     r_felix_scram,  clara,  'Who''s bringing the scramble tees? I only have the short ones.', null, now() - interval '15 minutes'),
    (kane, 'round_reminder',    r_felix_scram,  null,   null, null, now() - interval '25 minutes'),
    (kane, 'round_alert',       r_hannah,       hannah, null, null, now() - interval '40 minutes'),
    (kane, 'round_invite',      r_luca_invites, luca,   null, null, now() - interval '1 hour'),
    (kane, 'round_message',     r_kane_invite,  luca,   'Invited two from Free to play? Nice, hope they say yes.', now() - interval '1 hour 50 minutes', now() - interval '2 hours'),
    (kane, 'waitlist_promoted', r_felix_scram,  felix,  null, now() - interval '2 hours 55 minutes', now() - interval '3 hours'),
    (kane, 'friend_request',    null,           emma,   null, null, now() - interval '6 hours'),
    (kane, 'round_alert',       r_noah,         noah,   null, now() - interval '5 hours', now() - interval '7 hours'),
    (kane, 'player_joined',     r_kane_invite,  luca,   null, now() - interval '19 hours', now() - interval '20 hours'),
    (kane, 'player_joined',     r_kane_full,    lena,   null, now() - interval '1 day 20 hours', now() - interval '2 days'),
    (kane, 'friend_accepted',   null,           hannah, null, now() - interval '1 day', now() - interval '2 days'),
    (kane, 'player_joined',     r_kane_full,    felix,  null, now() - interval '2 days 20 hours', now() - interval '3 days');

  alter table notifications enable trigger notifications_send_push;
  alter table rounds enable trigger rounds_notify_search_alerts;
  alter table round_messages enable trigger round_messages_rate;
  alter table round_messages enable trigger round_messages_notify;
end $$;
