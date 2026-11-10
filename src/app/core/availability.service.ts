import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CartPref, FreePlayer, MyAvailability, PartOfDay } from './models';

export interface NewAvailability {
  /** YYYY-MM-DD */
  day: string;
  part: PartOfDay;
  lat: number;
  lng: number;
  placeName: string | null;
  radiusKm: number;
  note: string | null;
  cart: CartPref | null;
  womenOnly: boolean;
}

export interface FindFreeParams {
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
  courseId?: string | null;
  /** YYYY-MM-DD, inclusive */
  from?: string | null;
  /** YYYY-MM-DD, exclusive */
  to?: string | null;
}

/** A Date as YYYY-MM-DD in the phone's time zone. */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "I'm free" posts (supabase/migrations/0022_free_to_play.sql). */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private sb = inject(SupabaseService);

  /** Posting the same day again updates it. */
  async post(a: NewAvailability): Promise<string> {
    const { data, error } = await this.sb.client.rpc('post_availability', {
      p_day: a.day, p_part: a.part, p_lat: a.lat, p_lng: a.lng,
      p_place_name: a.placeName, p_radius_km: a.radiusKm, p_note: a.note, p_cart: a.cart, p_women_only: a.womenOnly
    });
    if (error) throw error;
    return data as string;
  }

  /** My posts from today on. */
  async mine(): Promise<MyAvailability[]> {
    const { data, error } = await this.sb.client
      .from('availability')
      .select('id, day, part_of_day, place_name, radius_km, note, cart, women_only')
      .eq('user_id', this.sb.userId)
      .gte('day', isoDay(new Date()))
      .order('day');
    if (error) throw error;
    return data as MyAvailability[];
  }

  async remove(id: string) {
    const { error } = await this.sb.client.from('availability').delete().eq('id', id);
    if (error) throw error;
  }

  async find(p: FindFreeParams): Promise<FreePlayer[]> {
    const { data, error } = await this.sb.client.rpc('find_available', {
      p_lat: p.lat ?? null,
      p_lng: p.lng ?? null,
      p_radius_km: p.radiusKm ?? 25,
      p_course_id: p.courseId ?? null,
      p_from: p.from ?? null,
      p_to: p.to ?? null
    });
    if (error) throw error;
    return data as FreePlayer[];
  }
}
