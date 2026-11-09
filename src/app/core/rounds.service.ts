import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Course, MyRound, PlayerStatus, RoundDetail, RoundResult } from './models';
import { RoundFormat } from './round-format';

export interface FindParams {
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
  courseId?: string | null;
  from?: Date | null;
  to?: Date | null;
  /** Only rounds in this format; null for any. */
  format?: RoundFormat | null;
}

export interface NewRound {
  course_id: string;
  tee_time: string;
  max_players: number;
  visibility: 'nearby' | 'invite_only';
  notes: string | null;
  format: RoundFormat;
}

@Injectable({ providedIn: 'root' })
export class RoundsService {
  private sb = inject(SupabaseService);

  async findRounds(p: FindParams): Promise<RoundResult[]> {
    const { data, error } = await this.sb.client.rpc('find_rounds', {
      p_lat: p.lat ?? null,
      p_lng: p.lng ?? null,
      p_radius_km: p.radiusKm ?? 25,
      p_course_id: p.courseId ?? null,
      p_from: (p.from ?? new Date()).toISOString(),
      p_to: p.to ? p.to.toISOString() : null,
      p_format: p.format ?? null
    });
    if (error) throw error;
    return data as RoundResult[];
  }

  async searchCourses(query: string | null, near?: { lat: number; lng: number } | null): Promise<Course[]> {
    const { data, error } = await this.sb.client.rpc('search_courses', {
      p_query: query?.trim() || null,
      p_lat: near?.lat ?? null,
      p_lng: near?.lng ?? null,
      p_limit: 10
    });
    if (error) throw error;
    return data as Course[];
  }

  async getCourse(id: string): Promise<Course | null> {
    const { data, error } = await this.sb.client.rpc('get_course', { p_id: id });
    if (error) throw error;
    return (data as Course[])[0] ?? null;
  }

  async createRound(r: NewRound): Promise<string> {
    const { data, error } = await this.sb.client
      .from('rounds')
      .insert({ ...r, host_id: this.sb.userId })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async getRound(id: string): Promise<RoundDetail> {
    const { data, error } = await this.sb.client
      .from('rounds')
      .select(
        `id, host_id, tee_time, max_players, visibility, notes, invite_code, status, format,
         courses(id, name, city),
         host:profiles!rounds_host_id_fkey(display_name, avatar_url, handicap_index),
         round_players(player_id, status, created_at, profiles(display_name, avatar_url, handicap_index))`
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as RoundDetail;
  }

  /** Rounds I'm in, plus ones I'm waitlisted or invited for (status tells which). */
  async myRounds(): Promise<MyRound[]> {
    const { data, error } = await this.sb.client
      .from('round_players')
      .select(
        `status, round_id,
         rounds(tee_time, max_players, status, courses(name), host:profiles!rounds_host_id_fkey(display_name), round_players(status))`
      )
      .eq('player_id', this.sb.userId)
      .in('status', ['host', 'confirmed', 'waitlisted', 'invited']);
    if (error) throw error;
    const now = Date.now();
    return (data as any[])
      .filter((row) => row.rounds && row.rounds.status !== 'cancelled' && new Date(row.rounds.tee_time).getTime() > now - 6 * 3600_000)
      .map((row) => ({
        status: row.status as PlayerStatus,
        round_id: row.round_id,
        tee_time: row.rounds.tee_time,
        course_name: row.rounds.courses.name,
        host_name: row.rounds.host.display_name,
        max_players: row.rounds.max_players,
        confirmed: row.rounds.round_players.filter((p: any) => p.status === 'host' || p.status === 'confirmed').length
      }))
      .sort((a, b) => a.tee_time.localeCompare(b.tee_time));
  }

  /** Instant join: the player is confirmed straight away. */
  async join(roundId: string): Promise<PlayerStatus> {
    const { data, error } = await this.sb.client.rpc('request_to_join', { p_round_id: roundId });
    if (error) throw error;
    return data as PlayerStatus;
  }

  async leave(roundId: string) {
    const { error } = await this.sb.client.rpc('leave_round', { p_round_id: roundId });
    if (error) throw error;
  }

  /** Host only. Marks the round cancelled and tells the players who joined. */
  async deleteRound(roundId: string) {
    const { error } = await this.sb.client.rpc('delete_round', { p_round_id: roundId });
    if (error) throw error;
  }

  /** My place on the waitlist (1 = next in), or null if I'm not on it. */
  async waitlistPosition(roundId: string): Promise<number | null> {
    const { data, error } = await this.sb.client.rpc('waitlist_position', { p_round_id: roundId });
    if (error) throw error;
    return (data as number | null) ?? null;
  }

  /** Host only: invites a player (from Free to play). They can then see the round and join. */
  async invite(roundId: string, playerId: string) {
    const { error } = await this.sb.client.rpc('invite_to_round', { p_round_id: roundId, p_player_id: playerId });
    if (error) throw error;
  }

  /** My upcoming rounds that still have room: the ones I can invite someone to. */
  async myOpenHostedRounds(): Promise<{ id: string; tee_time: string; course_name: string }[]> {
    const { data, error } = await this.sb.client
      .from('rounds')
      .select('id, tee_time, courses(name)')
      .eq('host_id', this.sb.userId)
      .eq('status', 'open')
      .gt('tee_time', new Date().toISOString())
      .order('tee_time');
    if (error) throw error;
    return (data as any[]).map((r) => ({ id: r.id, tee_time: r.tee_time, course_name: r.courses.name }));
  }

  /** Returns the round id. */
  async joinByInvite(code: string): Promise<string> {
    const { data, error } = await this.sb.client.rpc('join_by_invite', { p_invite_code: code });
    if (error) throw error;
    return data as string;
  }
}
