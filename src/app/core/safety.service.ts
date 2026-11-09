import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ReportReason = 'harassment' | 'no_show' | 'fake' | 'inappropriate' | 'other';
export const REPORT_REASONS: ReportReason[] = ['harassment', 'no_show', 'fake', 'inappropriate', 'other'];

export interface BlockedPlayer { id: string; display_name: string; avatar_url: string | null }

/** Blocking and reporting players (supabase/migrations/0015_block_and_report.sql). */
@Injectable({ providedIn: 'root' })
export class SafetyService {
  private sb = inject(SupabaseService);

  async block(userId: string) {
    const { error } = await this.sb.client.rpc('block_player', { p_user: userId });
    if (error) throw error;
  }

  async unblock(userId: string) {
    const { error } = await this.sb.client.rpc('unblock_player', { p_user: userId });
    if (error) throw error;
  }

  async report(userId: string, reason: ReportReason, details: string, roundId?: string | null) {
    const { error } = await this.sb.client.rpc('report_player', {
      p_user: userId, p_reason: reason, p_details: details || null, p_round_id: roundId ?? null
    });
    if (error) throw error;
  }

  /** Players I blocked, newest first. */
  async blocked(): Promise<BlockedPlayer[]> {
    const { data, error } = await this.sb.client
      .from('blocks')
      .select('blocked_id, created_at, profiles!blocks_blocked_id_fkey(display_name, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map((b) => ({ id: b.blocked_id, display_name: b.profiles.display_name, avatar_url: b.profiles.avatar_url }));
  }
}
