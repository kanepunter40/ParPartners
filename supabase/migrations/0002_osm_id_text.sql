-- OpenStreetMap ids are only unique per element type (node 5 and way 5 are different things),
-- so store them as text like 'way/123456'.
alter table courses alter column osm_id type text using osm_id::text;
