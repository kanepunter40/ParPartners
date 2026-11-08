-- Supabase grants EXECUTE on new public functions to anon and authenticated directly,
-- so 0001's "revoke ... from public" did not stop signed-out callers.
-- Signed-out users need none of these; the app always signs in first.
revoke execute on function
  find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz),
  search_courses(text, double precision, double precision, int),
  get_course(uuid),
  request_to_join(uuid),
  respond_to_request(uuid, uuid, boolean),
  leave_round(uuid),
  join_by_invite(text),
  refresh_round_status(uuid),
  spots_left(uuid),
  is_round_host(uuid),
  is_round_participant(uuid),
  add_host_as_player()
from public, anon;

-- Internal only: called from other functions and a trigger, never by the app.
revoke execute on function refresh_round_status(uuid), add_host_as_player() from authenticated;

-- player_cards runs with the owner's rights (bypasses RLS), and Supabase's default
-- grants let signed-out users read it. Signed-in users only.
revoke all on player_cards from public, anon, authenticated;
grant select on player_cards to authenticated;

-- Future functions: not callable by anon unless granted on purpose.
-- Two layers: Supabase's grant to anon on schema public, and Postgres's global
-- EXECUTE-to-PUBLIC default (which anon inherits). The second can only be removed globally.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres revoke execute on functions from public;
