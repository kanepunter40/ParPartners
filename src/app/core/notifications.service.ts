import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AppNotification } from './models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private sb = inject(SupabaseService);

  /** Drives the dot on the header bell. Refreshed by pages on enter. */
  readonly unread = signal(0);

  async list(): Promise<AppNotification[]> {
    const { data, error } = await this.sb.client
      .from('notifications')
      .select(
        `id, type, round_id, read_at, created_at, detail,
         actor:profiles!notifications_actor_id_fkey(display_name),
         rounds(tee_time, courses(name))`
      )
      .eq('user_id', this.sb.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as unknown as AppNotification[];
  }

  async refreshUnread() {
    const { count, error } = await this.sb.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', this.sb.userId)
      .is('read_at', null);
    if (!error) this.unread.set(count ?? 0);
  }

  async markAllRead() {
    const { error } = await this.sb.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', this.sb.userId)
      .is('read_at', null);
    if (error) throw error;
    this.unread.set(0);
  }
}
