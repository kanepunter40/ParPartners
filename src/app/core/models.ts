import { RoundFormat } from './round-format';
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
}

export type PlayerStatus = 'host' | 'confirmed' | 'requested' | 'declined' | 'withdrawn';

export interface RoundDetail {
  id: string;
  host_id: string;
  tee_time: string;
  max_players: number;
  visibility: 'nearby' | 'invite_only';
  notes: string | null;
  invite_code: string;
  status: 'open' | 'full' | 'cancelled' | 'played';
  format: RoundFormat;
  courses: { name: string; city: string | null };
  host: { display_name: string; avatar_url: string | null; handicap_index: number | null };
  round_players: { player_id: string; status: PlayerStatus; profiles: { display_name: string; avatar_url: string | null; handicap_index: number | null } }[];
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

export type NotificationType = 'request_received' | 'request_accepted' | 'request_declined' | 'player_joined' | 'player_left' | 'round_cancelled' | 'host_handover' | 'friend_request' | 'friend_accepted';

export interface AppNotification {
  id: string;
  type: NotificationType;
  round_id: string | null;
  read_at: string | null;
  created_at: string;
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
  courses: { name: string };
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
