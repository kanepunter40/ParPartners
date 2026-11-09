import { RoundFormat } from './round-format';

/**
 * Scoring for each format, worked out from strokes and pars. Gross only: handicap strokes need
 * each hole's stroke index, which the course data doesn't have yet.
 */

/** strokes(playerId, hole), undefined when not entered */
export type StrokesFn = (playerId: string, hole: number) => number | undefined;

/** Stableford: 2 points for par, one more for each stroke under, one fewer for each over, never below 0. */
export function stablefordPoints(strokes: number, par: number): number {
  return Math.max(0, 2 + par - strokes);
}

export function stablefordTotal(playerId: string, holes: number[], strokes: StrokesFn, par: (h: number) => number): number {
  return holes.reduce((t, h) => {
    const s = strokes(playerId, h);
    return s === undefined ? t : t + stablefordPoints(s, par(h));
  }, 0);
}

/** Two sides in a match: one player each (match play) or a pair each (best ball). */
export interface Side {
  name: string;
  ids: string[];
}

/** The side's score on a hole: the best (lowest) of its players, or undefined if nobody has one yet. */
export function sideScore(side: Side, h: number, strokes: StrokesFn): number | undefined {
  const scores = side.ids.map((id) => strokes(id, h)).filter((s): s is number => s !== undefined);
  return scores.length ? Math.min(...scores) : undefined;
}

export interface MatchState {
  /** holes won by A minus holes won by B */
  lead: number;
  /** holes where both sides have a score */
  played: number;
  remaining: number;
  /** the match can't be caught any more (or every hole is played) */
  decided: boolean;
}

/** Hole-by-hole match between two sides, over the holes both have scores for. */
export function match(a: Side, b: Side, holes: number[], strokes: StrokesFn): MatchState {
  let lead = 0;
  let played = 0;
  for (const h of holes) {
    const sa = sideScore(a, h, strokes);
    const sb = sideScore(b, h, strokes);
    if (sa === undefined || sb === undefined) continue;
    played++;
    if (sa < sb) lead++;
    else if (sb < sa) lead--;
  }
  const remaining = holes.length - played;
  return { lead, played, remaining, decided: Math.abs(lead) > remaining || remaining === 0 };
}

/** Which formats show a match between two sides. */
export function isMatchFormat(f: RoundFormat): boolean {
  return f === 'match_play' || f === 'best_ball';
}

/** What the card scores by: picked on the card, else the round's format, else stroke play. */
export function cardFormat(cardFormat: RoundFormat | null, roundFormat: RoundFormat | null | undefined): RoundFormat {
  const f = cardFormat ?? roundFormat ?? 'strokeplay';
  return f === 'casual' ? 'strokeplay' : f;
}
