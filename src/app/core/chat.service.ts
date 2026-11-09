import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ChatMessage } from './models';

/** Round chat (supabase/migrations/0023_round_chat.sql). Only the host and confirmed players can read or write. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private sb = inject(SupabaseService);

  async list(roundId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.sb.client
      .from('round_messages')
      .select('id, round_id, sender_id, body, created_at')
      .eq('round_id', roundId)
      .order('created_at')
      .limit(500);
    if (error) throw error;
    return data as ChatMessage[];
  }

  async send(roundId: string, body: string): Promise<ChatMessage> {
    const { data, error } = await this.sb.client
      .from('round_messages')
      .insert({ round_id: roundId, sender_id: this.sb.userId, body })
      .select('id, round_id, sender_id, body, created_at')
      .single();
    if (error) throw error;
    return data as ChatMessage;
  }

  /** Calls onMessage for each new message in the round (Supabase Realtime, which applies the same access rules). */
  subscribe(roundId: string, onMessage: (m: ChatMessage) => void): RealtimeChannel {
    return this.sb.client
      .channel(`round-chat-${roundId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'round_messages', filter: `round_id=eq.${roundId}` },
          (payload) => onMessage(payload.new as ChatMessage))
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel) {
    this.sb.client.removeChannel(channel);
  }

  /** The round's chat notifications count as read once the chat is open. */
  async markRead(roundId: string) {
    await this.sb.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', this.sb.userId)
      .eq('round_id', roundId)
      .eq('type', 'round_message')
      .is('read_at', null);
  }
}
