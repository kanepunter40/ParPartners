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
  courses: { name: string; city: string | null };
  host: { display_name: string; handicap_index: number | null };
  round_players: { player_id: string; status: PlayerStatus; profiles: { display_name: string; handicap_index: number | null } }[];
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
  handicap_index: number | null;
  no_handicap: boolean;
  home_course_id: string | null;
  languages: string[];
  onboarded: boolean;
}

export type NotificationType = 'request_received' | 'request_accepted' | 'request_declined' | 'player_joined' | 'player_left' | 'round_cancelled';

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

export interface Position {
  lat: number;
  lng: number;
}
