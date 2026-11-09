-- Two new places a player can be in a round. Enum values need their own transaction before
-- functions can use them, so they come first (used from 0021 on).
--   waitlisted: the round was full when they tried to join; moved in automatically when a spot opens
--   invited:    a host invited them from "Free to play"; they can see the round, then join or say no
alter type player_status add value if not exists 'waitlisted';
alter type player_status add value if not exists 'invited';
