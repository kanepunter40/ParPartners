import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FeedItem, Friend, FriendStatus } from './models';

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'removed';
  requester: { display_name: string; handicap_index: number | null };
  addressee: { display_name: string; handicap_index: number | null };
}

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private sb = inject(SupabaseService);

  /** A request the other player declined still shows as 'requested' to me. */
  private statusOf(row: Pick<FriendshipRow, 'requester_id' | 'status'>, me: string): FriendStatus {
    if (row.status === 'accepted') return 'friends';
    if (row.status === 'pending') return row.requester_id === me ? 'requested' : 'incoming';
    if (row.status === 'declined' && row.requester_id === me) return 'requested';
    return 'none';
  }

  /** Friends, requests to me and requests I sent. */
  async list(): Promise<Friend[]> {
    const me = this.sb.userId;
    const { data, error } = await this.sb.client
      .from('friendships')
      .select(`requester_id, addressee_id, status,
               requester:profiles!friendships_requester_id_fkey(display_name, handicap_index),
               addressee:profiles!friendships_addressee_id_fkey(display_name, handicap_index)`)
      .in('status', ['pending', 'accepted', 'declined']);
    if (error) throw error;
    return (data as unknown as FriendshipRow[])
      .map((r) => {
        const other = r.requester_id === me ? r.addressee : r.requester;
        return { id: r.requester_id === me ? r.addressee_id : r.requester_id, display_name: other.display_name, handicap_index: other.handicap_index, status: this.statusOf(r, me) };
      })
      .filter((f) => f.status !== 'none')
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  /** My status with each of these players (missing = none). */
  async statuses(ids: string[]): Promise<Map<string, FriendStatus>> {
    const me = this.sb.userId;
    const others = ids.filter((id) => id !== me);
    if (!others.length) return new Map();
    const { data, error } = await this.sb.client
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.in.(${others.join(',')}),addressee_id.in.(${others.join(',')})`);
    if (error) throw error;
    return new Map((data ?? []).map((r) => [r.requester_id === me ? r.addressee_id : r.requester_id, this.statusOf(r, me)]));
  }

  /** Players by name, not including me. */
  async search(query: string): Promise<{ id: string; display_name: string; handicap_index: number | null }[]> {
    const q = query.trim().replace(/[%_\,()]/g, '');
    if (q.length < 2) return [];
    const { data, error } = await this.sb.client
      .from('profiles')
      .select('id, display_name, handicap_index')
      .ilike('display_name', `%${q}%`)
      .neq('id', this.sb.userId)
      .eq('onboarded', true)
      .order('display_name')
      .limit(20);
    if (error) throw error;
    return data ?? [];
  }

  /** Returns the new status: 'requested', or 'friends' if they had already asked me. */
  async add(userId: string): Promise<FriendStatus> {
    const { data, error } = await this.sb.client.rpc('send_friend_request', { p_user: userId });
    if (error) throw error;
    return data === 'accepted' ? 'friends' : 'requested';
  }

  async respond(userId: string, accept: boolean) {
    const { error } = await this.sb.client.rpc('respond_friend_request', { p_user: userId, p_accept: accept });
    if (error) throw error;
  }

  /** Unfriend, or withdraw a request I sent. */
  async remove(userId: string) {
    const { error } = await this.sb.client.rpc('remove_friend', { p_user: userId });
    if (error) throw error;
  }

  async feed(before: string | null = null): Promise<FeedItem[]> {
    const { data, error } = await this.sb.client.rpc('home_feed', { p_before: before, p_limit: 30 });
    if (error) throw error;
    return data as FeedItem[];
  }
}
