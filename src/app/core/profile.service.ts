import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PlayerCard, Profile } from './models';
import { RoundLength, Vibe } from './profile-options';

/** Everything a player fills in about themselves, in onboarding or when editing. */
export interface ProfileData {
  displayName: string;
  homeCourseId: string | null;
  handicap: number | null;
  noHandicap: boolean;
  languages: string[];
  birthYear: number | null;
  gender: string | null;
  showAgeGender: boolean;
  playTimes: string[];
  roundLength: RoundLength;
  vibe: Vibe;
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

  /** My full profile, including the private fields, for the edit form. */
  async details(): Promise<ProfileData> {
    const id = this.sb.userId;
    const [pub, priv] = await Promise.all([
      this.sb.client.from('profiles').select('display_name, home_course_id, handicap_index, no_handicap, languages, play_times, round_length, vibe').eq('id', id).single(),
      this.sb.client.from('profile_private').select('birth_year, gender, show_age_gender').eq('id', id).maybeSingle()
    ]);
    if (pub.error) throw pub.error;
    if (priv.error) throw priv.error;
    const p = pub.data;
    return {
      displayName: p.display_name,
      homeCourseId: p.home_course_id,
      handicap: p.handicap_index,
      noHandicap: p.no_handicap,
      languages: p.languages,
      birthYear: priv.data?.birth_year ?? null,
      gender: priv.data?.gender ?? null,
      showAgeGender: priv.data?.show_age_gender ?? false,
      playTimes: p.play_times,
      roundLength: p.round_length,
      vibe: p.vibe
    };
  }

  /** My profile as other players see it (age and gender only if I share them). */
  async myCard(): Promise<PlayerCard | null> {
    const { data, error } = await this.sb.client
      .from('player_cards')
      .select('id, display_name, home_course_id, handicap_index, languages, vibe, age, gender')
      .eq('id', this.sb.userId)
      .maybeSingle();
    if (error) throw error;
    return data as PlayerCard | null;
  }

  /** Permanent. Rounds I host with others in them pass to the next player; the rest goes. */
  async deleteAccount() {
    const { error } = await this.sb.client.rpc('delete_account');
    if (error) throw error;
    this.cache = null;
  }

  async save(d: ProfileData) {
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
