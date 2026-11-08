-- Removes everything dummy_data.sql added. Run in the Supabase SQL editor.
-- (The Supabase MCP refuses SQL containing "delete", so this can't be run from Claude.)

delete from notifications
where actor_id::text like 'd0000000-%' or round_id::text like 'd1000000-%';
delete from scorecards where id::text like 'd2000000-%';
delete from rounds where id::text like 'd1000000-%';   -- includes Kane's test round at Nippenburg
-- Profiles, friendships, round places and the rest go with the users (on delete cascade)
delete from auth.users where id::text like 'd0000000-%' and email like 'dummy.%@parpartners.test';
