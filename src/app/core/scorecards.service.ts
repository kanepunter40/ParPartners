import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CardHoles, Scorecard, ScorecardSummary } from './models';

/** Hole numbers on a card, in playing order. */
export function holeNumbers(holes: CardHoles): number[] {
  const [from, to] = holes === 'front9' ? [1, 9] : holes === 'back9' ? [10, 18] : [1, 18];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** i18n keys: t(HOLES_LABEL[card.holes]). */
export const HOLES_LABEL: Record<CardHoles, string> = { '18': 'holes.18', front9: 'holes.front9', back9: 'holes.back9' };

/** "E" for level, "+3" over, "−2" under. */
export function formatToPar(diff: number): string {
  return diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `−${-diff}`;
}

export function isComplete(s: ScorecardSummary): boolean {
  return s.holes_played === holeNumbers(s.holes).length;
}

/** Stats over finished 18-hole cards. average and best are null when there are none. */
export function cardStats(items: ScorecardSummary[]) {
  const done = items.filter((s) => s.holes === '18' && isComplete(s));
  return {
    rounds18: done.length,
    average: done.length ? (done.reduce((t, s) => t + s.strokes, 0) / done.length).toFixed(1) : null,
    best: done.length ? Math.min(...done.map((s) => s.strokes)) : null
  };
}

@Injectable({ providedIn: 'root' })
export class ScorecardsService {
  private sb = inject(SupabaseService);

  /** Opens the round's card (adding anyone who joined since), or creates it. With holes = null, only opens: returns null if there is none yet. */
  async startForRound(roundId: string, holes: CardHoles | null): Promise<string | null> {
    const { data, error } = await this.sb.client.rpc('start_round_scorecard', { p_round_id: roundId, p_holes: holes });
    if (error) throw error;
    return data as string | null;
  }

  async startSolo(courseId: string, holes: CardHoles, guests: string[]): Promise<string> {
    const { data, error } = await this.sb.client.rpc('start_solo_scorecard', { p_course_id: courseId, p_holes: holes, p_guests: guests });
    if (error) throw error;
    return data as string;
  }

  async get(id: string): Promise<Scorecard> {
    const { data, error } = await this.sb.client
      .from('scorecards')
      .select('id, course_id, round_id, holes, played_at, created_by, courses(name), scorecard_players(id, profile_id, name, position, scores(hole, strokes))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as Scorecard;
  }

  /** Known pars for a course, by hole number. */
  async pars(courseId: string): Promise<Map<number, number>> {
    const { data, error } = await this.sb.client.from('course_holes').select('hole, par').eq('course_id', courseId);
    if (error) throw error;
    return new Map((data ?? []).map((h) => [h.hole, h.par]));
  }

  /** strokes = null clears the hole. */
  async setScore(scorecardPlayerId: string, hole: number, strokes: number | null) {
    const { error } = await this.sb.client.rpc('set_score', { p_scorecard_player_id: scorecardPlayerId, p_hole: hole, p_strokes: strokes });
    if (error) throw error;
  }

  async setPar(courseId: string, hole: number, par: number) {
    const { error } = await this.sb.client.rpc('set_hole_par', { p_course_id: courseId, p_hole: hole, p_par: par });
    if (error) throw error;
  }

  async history(): Promise<ScorecardSummary[]> {
    const { data, error } = await this.sb.client.rpc('my_scorecards');
    if (error) throw error;
    return data as ScorecardSummary[];
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('scorecards').delete().eq('id', id);
    if (error) throw error;
  }
}
