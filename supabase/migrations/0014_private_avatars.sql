-- Profile pictures are only for signed-in players: the bucket is no longer public, and the
-- app asks for a short-lived signed link to each picture (valid 24 hours).

update storage.buckets set public = false where id = 'avatars';

create policy avatars_read_signed_in on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
