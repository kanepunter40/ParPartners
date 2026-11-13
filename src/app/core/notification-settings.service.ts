import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** Groups a player can turn off in Settings > Notifications. The push function maps each
 *  notification type to one of these (supabase/functions/push/index.ts, GROUP). */
export const NOTIFICATION_GROUPS = ['your_rounds', 'joining', 'changes', 'reminders', 'chat', 'friends', 'searches'] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
  private sb = inject(SupabaseService);

  /** The groups this player turned off. No row yet means everything is on. */
  async muted(): Promise<NotificationGroup[]> {
    const { data, error } = await this.sb.client.from('notification_settings').select('muted').maybeSingle();
    if (error) throw error;
    return (data?.muted ?? []) as NotificationGroup[];
  }

  async save(muted: NotificationGroup[]) {
    const user_id = this.sb.session()?.user.id;
    if (!user_id) throw new Error('Not signed in');
    const { error } = await this.sb.client
      .from('notification_settings')
      .upsert({ user_id, muted, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}
