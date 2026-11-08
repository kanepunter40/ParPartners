import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile } from './models';

export interface OnboardingData {
  displayName: string;
  homeCourseId: string | null;
  handicap: number | null;
  noHandicap: boolean;
  languages: string[];
  birthYear: number | null;
  gender: string | null;
  showAgeGender: boolean;
  playTimes: string[];
  roundLength: 'nine' | 'eighteen' | 'either';
  vibe: 'relaxed' | 'competitive' | 'very_competitive';
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private sb = inject(SupabaseService);
  private cache: Profile | null = null;

  async load(force = false): Promise<Profile | null> {
    if (this.cache && !force) return this.cache;
    const { data, error } = await this.sb.client
      .from('profiles')
      .select('id, display_name, handicap_index, no_handicap, home_course_id, languages, onboarded')
      .eq('id', this.sb.userId)
      .maybeSingle();
    if (error) throw error;
    this.cache = data as Profile | null;
    return this.cache;
  }

  clear() {
    this.cache = null;
  }

  async saveOnboarding(d: OnboardingData) {
    const id = this.sb.userId;
    const { error } = await this.sb.client.from('profiles').upsert({
      id,
      display_name: d.displayName.trim(),
      home_course_id: d.homeCourseId,
      handicap_index: d.noHandicap ? null : d.handicap,
      no_handicap: d.noHandicap,
      languages: d.languages,
      play_times: d.playTimes,
      round_length: d.roundLength,
      vibe: d.vibe,
      onboarded: true
    });
    if (error) throw error;
    const { error: e2 } = await this.sb.client.from('profile_private').upsert({
      id,
      birth_year: d.birthYear,
      gender: d.gender,
      show_age_gender: d.showAgeGender
    });
    if (e2) throw e2;
    this.cache = null;
  }
}
