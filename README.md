# Par Partners

Find playing partners near you, or post a round and fill the last spot.
Ionic 8 + Angular 20 (standalone components, signals) + Capacitor, with Supabase (Postgres + PostGIS) as the backend.

## Setup

1. Create a Supabase project. Choose an **EU region (Frankfurt)**.
2. In the SQL editor, run every file in `supabase/migrations/` in order, then `supabase/courses_import.sql` (courses) and `supabase/course_holes_import.sql` (hole pars).
3. Authentication > URL configuration: add your dev URL (`http://localhost:4200`) as a redirect URL. Email sign-in uses magic links.
4. Copy `src/environments/environment.example.ts` to `src/environments/environment.ts` and put in the project URL and publishable key. `environment.ts` is git-ignored.
5. `npm install`, then `npx ng serve`.

## Native builds (later)

```
npx ng build
npx cap add ios      # and/or android
npx cap sync
npx cap open ios
```
Push notifications and background location need the native builds, plus an Apple developer account for iOS.

## What's here

| Area | Where |
|---|---|
| Database, RLS, search and join functions | `supabase/migrations/0001_init.sql` |
| Sign in (magic link) | `pages/welcome` |
| Onboarding (name, course, handicap, languages, about you, how you play) | `pages/onboarding` |
| Find a round (near a location with radius, or by course) | `pages/find` |
| Post a round | `pages/create-round` |
| Round detail, request to join, host accepts or declines | `pages/round-detail` |
| My rounds, profile | `pages/rounds`, `pages/profile` |
| Supabase client, services, guards | `core/` |

## Design decisions worth knowing

- **Search by radius is in the database.** `find_rounds()` uses PostGIS `st_dwithin`, so distance filtering is exact and fast, and it already hides full rounds, invite-only rounds, your own rounds and rounds you have joined.
- **Privacy is split by table.** Row Level Security works on rows, not columns, so age and gender live in `profile_private` (owner only). Other players read the `player_cards` view, which only reveals them when the player switched "Show on my profile" on.
- **Year of birth, not age.** Stored as `birth_year` and shown as an age only when the player allows it.
- **Joining goes through functions** (`request_to_join`, `respond_to_request`, `leave_round`, `join_by_invite`). Clients cannot write to `round_players` directly, so nobody can approve themselves or overfill a round.

## Not built yet

- `/join/:code` route (the function `join_by_invite` exists; the share link points at it).
- Push notifications: a `notifications` row is already written on every request and reply. Next: store the device token in `device_tokens` and send via an edge function.
- Notification permission step in onboarding, notifications screen, profile editing, and the "regular partners" page.
- Searching by place name (needs a geocoder). For now Find centres on your home course, or "My location".
- Importing real courses from OpenStreetMap (`leisure=golf_course`) into `courses` (`osm_id` column is ready).
- Tests.
