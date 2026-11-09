/** How a round is played (supabase/migrations/0018_round_format.sql). A label for now: scoring counts strokes. */
export type RoundFormat = 'casual' | 'strokeplay' | 'stableford' | 'match_play' | 'best_ball' | 'scramble';

/** In the order the host sees them. Names and one-line explanations are under "format" in the i18n files. */
export const ROUND_FORMATS: RoundFormat[] = ['casual', 'strokeplay', 'stableford', 'match_play', 'best_ball', 'scramble'];
