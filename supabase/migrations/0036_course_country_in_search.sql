-- Course search and lookup also return the country, so the app can show a small flag:
-- two courses with the same name in different countries can then be told apart.
-- The return type changes, so the functions are dropped and created again with the same grants.

drop function search_courses(text, double precision, double precision, integer);
create function search_courses(p_query text default null, p_lat double precision default null, p_lng double precision default null, p_limit integer default 10)
returns table(id uuid, name text, city text, country text, lat double precision, lng double precision, distance_km double precision)
language sql stable
set search_path to 'public', 'extensions'
as $$
  select c.id, c.name, c.city, c.country,
         st_y(c.location::geometry), st_x(c.location::geometry),
         case when p_lat is null then null
              else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end
  from courses c
  where p_query is null or c.name ilike '%' || p_query || '%' or c.city ilike '%' || p_query || '%'
  order by case when p_lat is null then 0 else st_distance(c.location, st_point(p_lng, p_lat)::geography) end, c.name
  limit least(p_limit, 25);
$$;
revoke execute on function search_courses(text, double precision, double precision, integer) from public, anon;
grant execute on function search_courses(text, double precision, double precision, integer) to authenticated, service_role;

drop function get_course(uuid);
create function get_course(p_id uuid)
returns table(id uuid, name text, city text, country text, lat double precision, lng double precision)
language sql stable
set search_path to 'public', 'extensions'
as $$
  select c.id, c.name, c.city, c.country, st_y(c.location::geometry), st_x(c.location::geometry)
  from courses c where c.id = p_id;
$$;
revoke execute on function get_course(uuid) from public, anon;
grant execute on function get_course(uuid) to authenticated, service_role;
