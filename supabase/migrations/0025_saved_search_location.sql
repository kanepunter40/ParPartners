-- Saved searches (search_alerts) can be opened again in Find, so the list also returns
-- each area search's centre. The result columns change, so the function is recreated.

drop function my_search_alerts();

create function my_search_alerts()
returns table (id uuid, course_id uuid, course_name text, place_name text, radius_km smallint,
               lat double precision, lng double precision, days text, format text, created_at timestamptz)
language sql stable security invoker set search_path = public, extensions as $$
  select a.id, a.course_id, c.name, a.place_name, a.radius_km,
         st_y(a.centre::geometry), st_x(a.centre::geometry),
         a.days, a.format, a.created_at
  from search_alerts a left join courses c on c.id = a.course_id
  where a.user_id = auth.uid()
  order by a.created_at desc;
$$;

revoke execute on function my_search_alerts() from public, anon;
grant execute on function my_search_alerts() to authenticated;
