-- The app only ever marks notifications as read. Limit updates to that column,
-- and stop a notification being moved to another user.
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

alter policy notifications_update on notifications with check (user_id = auth.uid());

-- Unread count for the header dot
create index notifications_unread_idx on notifications (user_id) where read_at is null;
