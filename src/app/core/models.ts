import { RoundFormat } from './round-format';

/** Walking or riding a cart; null on a round or post means either is fine. */
export type CartPref = "walk" | "cart";
export interface Course {
  id: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  distance_km?: number | null;
}

export interface RoundResult {
  round_id: string;
  course_id: string;
  course_name: string;
  tee_time: string;
  distance_km: number | null;
  spots_left: number;
  max_players: number;
  host_id: string;
  host_name: string;
  host_handicap: number | null;
  format: RoundFormat;
  /** walk / cart; null = either */
  cart: CartPref | null;
}

/** waitlisted: joined a full round, moved in when a spot opens. invited: a host invited them from Free to play. */
export type PlayerStatus = 'host' | 'confirmed' | 'requested' | 'declined' | 'withdrawn' | 'waitlisted' | 'invited';

export interface RoundDetail {
  id: string;
  host_id: string;
  tee_time: string;
  max_players: number;
  visibility: 'nearby' | 'invite_only';
  notes: string | null;
  status: 'open' | 'full' | 'cancelled' | 'played';
  format: RoundFormat;
  /** walk / cart; null = either */
  cart: CartPref | null;
  courses: { id: string; name: string; city: string | null };
  host: { display_name: string; avatar_url: string | null; handicap_index: number | null };
  round_players: { player_id: string; status: PlayerStatus; created_at: string; profiles: { display_name: string; avatar_url: string | null; handicap_index: number | null } }[];
}

export interface MyRound {
  status: PlayerStatus;
  round_id: string;
  tee_time: string;
  course_name: string;
  host_name: string;
  confirmed: number;
  max_players: number;
}

export interface Profile {
  id: string;
  display_name: string;
  /** Storage path of the profile picture, or null for initials. */
  avatar_url: string | null;
  handicap_index: number | null;
  no_handicap: boolean;
  home_course_id: string | null;
  languages: string[];
  onboarded: boolean;
}

/** What other players can see about someone (the player_cards view). */
export interface PlayerCard {
  id: string;
  display_name: string;
  avatar_url: string | null;
  home_course_id: string | null;
  handicap_index: number | null;
  languages: string[];
  vibe: 'relaxed' | 'competitive' | 'very_competitive';
  /** null unless the player shares age and gender */
  age: number | null;
  gender: string | null;
}

export type NotificationType = 'request_received' | 'request_accepted' | 'request_declined' | 'player_joined' | 'player_left' | 'round_cancelled'
  | 'host_handover' | 'friend_request' | 'friend_accepted' | 'round_reminder' | 'report_received'
  | 'round_alert' | 'round_invite' | 'round_message' | 'waitlist_promoted' | 'player_free' | 'free_alert';

export interface AppNotification {
  id: string;
  type: NotificationType;
  round_id: string | null;
  read_at: string | null;
  created_at: string;
  /** Start of a chat message (round_message), otherwise null */
  detail: string | null;
  /** The day a player is free, YYYY-MM-DD (player_free, free_alert), otherwise null */
  day: string | null;
  actor_id: string | null;
  actor: { display_name: string } | null;
  /** null when the round was deleted or is no longer visible to this user */
  rounds: { tee_time: string; courses: { name: string } } | null;
}

/** Which holes a scorecard covers. */
export type CardHoles = '18' | 'front9' | 'back9';

export interface ScorecardPlayer {
  id: string;
  /** null for guests (people without the app) */
  profile_id: string | null;
  name: string;
  position: number;
  scores: { hole: number; strokes: number }[];
}

export interface Scorecard {
  id: string;
  course_id: string;
  round_id: string | null;
  holes: CardHoles;
  played_at: string;
  created_by: string;
  /** Picked on the card; null = the round's format (stroke play for a solo card) */
  format: RoundFormat | null;
  courses: { name: string };
  rounds: { format: RoundFormat } | null;
  scorecard_players: ScorecardPlayer[];
}

export interface ScorecardSummary {
  id: string;
  course_name: string;
  played_at: string;
  holes: CardHoles;
  round_id: string | null;
  /** my strokes over the holes I have a score for */
  strokes: number;
  holes_played: number;
  /** par over the same holes (unknown pars count as 4) */
  par_played: number;
}

/** Where I stand with another player. 'incoming' = they asked me. */
export type FriendStatus = 'none' | 'requested' | 'incoming' | 'friends';

export interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
  handicap_index: number | null;
  status: FriendStatus;
}

/** One update on the Home feed (the home_feed function). Fields not used by a kind are null. */
export interface FeedItem {
  kind: 'scorecard' | 'round_posted' | 'round_joined' | 'new_friend';
  at: string;
  actor_id: string;
  actor_name: string;
  /** Filled in by FriendsService.feed (not part of home_feed). */
  actor_avatar?: string | null;
  other_id: string | null;
  other_name: string | null;
  round_id: string | null;
  scorecard_id: string | null;
  course_name: string | null;
  tee_time: string | null;
  spots_left: number | null;
  holes: CardHoles | null;
  strokes: number | null;
  to_par: number | null;
  personal_best: boolean;
}

export interface Position {
  lat: number;
  lng: number;
}

/** A saved search in Find (search_alerts). Either course_id or an area (place_name + radius_km). */
export interface SearchAlert {
  id: string;
  course_id: string | null;
  course_name: string | null;
  place_name: string | null;
  radius_km: number | null;
  /** Centre of an area search (null for a course search) */
  lat: number | null;
  lng: number | null;
  days: 'any' | 'weekend' | 'weekday';
  format: RoundFormat | null;
  /** Also notify when a player posts that they're free in this area */
  include_free: boolean;
  created_at: string;
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'any';

/** Another player's "I'm free" post (find_available). */
export interface FreePlayer {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  handicap_index: number | null;
  /** YYYY-MM-DD */
  day: string;
  part_of_day: PartOfDay;
  place_name: string | null;
  radius_km: number;
  note: string | null;
  cart: CartPref | null;
  distance_km: number | null;
}

/** One of my own "I'm free" posts. */
export interface MyAvailability {
  id: string;
  day: string;
  part_of_day: PartOfDay;
  place_name: string | null;
  radius_km: number;
  note: string | null;
  cart: CartPref | null;
}

export interface ChatMessage {
  id: string;
  round_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}
