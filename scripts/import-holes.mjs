#!/usr/bin/env node
// Builds supabase/course_holes_import.sql: par per hole from OpenStreetMap (golf=hole ways with ref and par),
// matched to courses already imported by import-courses.mjs (via courses.osm_id).
//
//   node scripts/import-holes.mjs                          # all of Germany, in 1° tiles
//   node scripts/import-holes.mjs --country FR             # all of mainland France and Corsica
//   node scripts/import-holes.mjs --bbox 48.3,8.5,49.2,9.9 # one region (south,west,north,east)
//   node scripts/import-holes.mjs --from-file supabase/holes_overpass.json   # reuse the saved responses
//
// Then run the generated file in the Supabase SQL editor. Safe to re-run: OpenStreetMap pars are
// updated, but pars that players corrected in the app (source = 'player') are never overwritten.
//
// Data (c) OpenStreetMap contributors, ODbL.

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const argValue = (flag) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : null);
const fromFile = argValue('--from-file');
/** Bounding boxes (south,west,north,east) per country. Tiles also catch neighbours' courses; the SQL only keeps imported ones. */
// Several boxes are separated by ';' (France: mainland, then Corsica).
const COUNTRY_BBOX = { DE: '47.2,5.8,55.1,15.1', FR: '42.3,-4.9,51.1,8.3;41.3,8.5,43.1,9.6' };
const country = (argValue('--country') ?? 'DE').toUpperCase();
if (!COUNTRY_BBOX[country]) throw new Error(`No bounding box for ${country}. Add it to COUNTRY_BBOX or pass --bbox.`);
const boxes = (argValue('--bbox') ?? COUNTRY_BBOX[country]).split(';').map((b) => b.split(',').map(Number));
// Germany keeps the original file names; other countries get their own, e.g. course_holes_import_fr.sql
const suffix = country === 'DE' ? '' : `_${country.toLowerCase()}`;
const OUT = new URL(`../supabase/course_holes_import${suffix}.sql`, import.meta.url);
const RAW = new URL(`../supabase/holes_overpass${suffix}.json`, import.meta.url);

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

/** One element per course in the tile: its OSM id and "ref:par" for each hole inside it. */
const tileQuery = ([s, w, n, e]) => `[out:json][timeout:120];
(way["leisure"="golf_course"](${s},${w},${n},${e});relation["leisure"="golf_course"](${s},${w},${n},${e}););
foreach->.c(
  .c map_to_area->.a;
  way["golf"="hole"]["ref"]["par"](area.a)->.h;
  make course osm_id=c.u(type()+"/"+id()), holes=h.set(t["ref"]+":"+t["par"]), count=h.count(ways);
  out;
);`;

/** Splits the box into 1° tiles so each Overpass query stays small. */
export function tiles([s, w, n, e], size = 1) {
  const out = [];
  for (let lat = s; lat < n; lat += size)
    for (let lon = w; lon < e; lon += size)
      out.push([lat, lon, Math.min(lat + size, n), Math.min(lon + size, e)].map((v) => Number(v.toFixed(4))));
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTile(tile) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'par-partners-import/1.0' },
        body: 'data=' + encodeURIComponent(tileQuery(tile)),
        signal: AbortSignal.timeout(180000) // a hung connection would otherwise stall the import forever
      });
      if (!res.ok) throw new Error(`${url} answered ${res.status}`);
      return (await res.json()).elements ?? [];
    } catch (e) {
      lastErr = e;
      await sleep(2000 * 2 ** attempt); // Overpass asks for exponential backoff when busy
    }
  }
  throw lastErr;
}

/**
 * Turn Overpass "course" elements into hole rows. A hole is skipped when its ref isn't a single
 * number from 1 to 27, its par isn't 3 to 6, or the course has two holes with that number and different pars.
 */
export function toRows(elements) {
  const byCourse = new Map();
  for (const el of elements) {
    const osmId = el.tags?.osm_id;
    if (!osmId || !el.tags.holes) continue;
    const holes = byCourse.get(osmId) ?? new Map();
    for (const pair of el.tags.holes.split(';')) {
      const [ref, par] = pair.split(':').map((v) => v.trim());
      if (!/^\d{1,2}$/.test(ref) || !/^\d$/.test(par)) continue;
      const hole = Number(ref), p = Number(par);
      if (hole < 1 || hole > 27 || p < 3 || p > 6) continue;
      holes.set(hole, holes.has(hole) && holes.get(hole) !== p ? null : p);
    }
    byCourse.set(osmId, holes);
  }
  const rows = [];
  for (const [osmId, holes] of byCourse)
    for (const [hole, par] of holes) if (par != null) rows.push({ osmId, hole, par });
  return rows.sort((a, b) => a.osmId.localeCompare(b.osmId) || a.hole - b.hole);
}

const sql = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function toSqlFile(rows) {
  const courses = new Set(rows.map((r) => r.osmId)).size;
  const values = rows.map((r) => `  (${sql(r.osmId)}, ${r.hole}, ${r.par})`).join(',\n');
  return `-- Generated by scripts/import-holes.mjs on ${new Date().toISOString().slice(0, 10)}.
-- ${rows.length} hole pars on ${courses} courses. Data (c) OpenStreetMap contributors, ODbL.
-- Requires migration 0009. Safe to re-run; pars corrected by players are kept.
insert into course_holes (course_id, hole, par, source)
select c.id, v.hole, v.par, 'osm'
from (values
${values}
) as v(osm_id, hole, par)
join courses c on c.osm_id = v.osm_id
on conflict (course_id, hole) do update
  set par = excluded.par, updated_at = now()
  where course_holes.source = 'osm';
`;
}

// Run only when executed directly (not when imported by a test)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let elements;
  if (fromFile) {
    elements = JSON.parse(readFileSync(fromFile, 'utf8'));
  } else {
    const all = boxes.flatMap((b) => tiles(b));
    elements = [];
    const failed = [];
    for (const [i, tile] of all.entries()) {
      try {
        elements.push(...(await fetchTile(tile)));
        console.log(`Tile ${i + 1}/${all.length} done`);
      } catch (e) {
        failed.push(tile);
        console.warn(`Tile ${i + 1}/${all.length} failed (${e.message}): --bbox ${tile.join(',')}`);
      }
      await sleep(1000); // be polite to the public servers
    }
    writeFileSync(RAW, JSON.stringify(elements));
    if (failed.length) console.warn(`${failed.length} tiles failed. Re-run those with --bbox, or the whole import later.`);
  }
  const rows = toRows(elements);
  if (!rows.length) {
    console.error('No hole pars found. Try again later (Overpass can be busy).');
    process.exit(1);
  }
  writeFileSync(OUT, toSqlFile(rows));
  console.log(`Wrote ${rows.length} hole pars on ${new Set(rows.map((r) => r.osmId)).size} courses to supabase/course_holes_import${suffix}.sql`);
  console.log('Next: paste that file into the Supabase SQL editor and run it.');
}
