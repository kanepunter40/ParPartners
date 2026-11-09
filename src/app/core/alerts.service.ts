import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SearchAlert } from './models';
import { RoundFormat } from './round-format';

export interface NewAlert {
  /** A course alert, or ... */
  courseId?: string | null;
  /** ... an area alert: centre, radius and a name to show for it */
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  placeName?: string | null;
  days: SearchAlert['days'];
  format: RoundFormat | null;
}

/** Saved searches: a push when someone posts a matching round (supabase/migrations/0020_search_alerts.sql). */
@Injectable({ providedIn: 'root' })
export class AlertsService {
  private sb = inject(SupabaseService);

  async list(): Promise<SearchAlert[]> {
    const { data, error } = await this.sb.client.rpc('my_search_alerts');
    if (error) throw error;
    return data as SearchAlert[];
  }

  /** Saving the same search twice returns the existing alert. */
  async create(a: NewAlert): Promise<string> {
    const { data, error } = await this.sb.client.rpc('create_search_alert', {
      p_course_id: a.courseId ?? null,
      p_lat: a.courseId ? null : a.lat ?? null,
      p_lng: a.courseId ? null : a.lng ?? null,
      p_radius_km: a.radiusKm ?? 25,
      p_place_name: a.placeName ?? null,
      p_days: a.days,
      p_format: a.format
    });
    if (error) throw error;
    return data as string;
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('search_alerts').delete().eq('id', id);
    if (error) throw error;
  }
}
