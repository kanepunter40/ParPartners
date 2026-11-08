-- Profile pictures. Stored in the public "avatars" bucket as <user id>/<name>.jpg.
-- profiles.avatar_url holds that storage path (not a full URL); the app builds the URL.
-- Players without a picture are shown with their initials.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Anyone with the link can view a picture (public bucket). Writing, replacing and removing
-- is only allowed inside your own folder. One "for all" policy, because uploads also need
-- select (to check for an existing file) and removing needs select too.
create policy avatars_own_folder on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Only a path in your own folder, so a profile can't point at an outside image (tracking pixels).
alter table profiles add constraint profiles_avatar_path check (
  avatar_url is null or avatar_url ~ ('^' || id::text || '/[A-Za-z0-9_-]+\.(jpg|png|webp)$')
);
