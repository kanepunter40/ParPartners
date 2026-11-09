-- Removes everything dummy_data.sql and dummy_data_more.sql added. Run in the Supabase SQL editor.
-- (The Supabase MCP refuses SQL containing "delete", so this can't be run from Claude.)

delete from notifications
where actor_id::text like 'd0000000-%' or round_id::text like 'd1000000-%';
delete from scorecards where id::text like 'd2000000-%';
delete from rounds where id::text like 'd1000000-%';   -- includes Kane's test round at Nippenburg; chats go with the rounds
delete from search_alerts where id::text like 'd3000000-%';  -- Kane's test alerts
delete from availability where id::text like 'd5000000-%';   -- Kane's test "I'm free" post
-- Profiles, friendships, round places, "I'm free" posts and the rest go with the users (on delete cascade)
delete from auth.users where id::text like 'd0000000-%' and email like 'dummy.%@parpartners.test';
