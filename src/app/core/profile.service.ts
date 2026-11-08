import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PlayerCard, Profile } from './models';
import { RoundLength, Vibe } from './profile-options';
import { squareJpeg } from './image';

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
  /** Goes up whenever I change my profile or picture, so screens that are already open can reload. */
  readonly version = signal(0);

  private changed() {
    this.cache = null;
    this.version.update((v) => v + 1);
  }

  async load(force = false): Promise<Profile | null> {
    if (this.cache && !force) return this.cache;
    const { data, error } = await this.sb.client
      .from('profiles')
      .select('id, display_name, avatar_url, handicap_index, no_handicap, home_course_id, languages, onboarded')
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
      .select('id, display_name, avatar_url, home_course_id, handicap_index, languages, vibe, age, gender')
      .eq('id', this.sb.userId)
      .maybeSingle();
    if (error) throw error;
    return data as PlayerCard | null;
  }

  /** Shrinks the picture, uploads it and makes it my profile picture. Returns the new storage path. */
  async setAvatar(file: Blob): Promise<string> {
    const id = this.sb.userId;
    const jpeg = await squareJpeg(file);
    // A new name each time, so phones don't keep showing the old picture from their cache
    const path = `${id}/${Date.now()}.jpg`;
    const bucket = this.sb.client.storage.from('avatars');
    const up = await bucket.upload(path, jpeg, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (up.error) throw up.error;
    const { error } = await this.sb.client.from('profiles').update({ avatar_url: path }).eq('id', id);
    if (error) {
      await bucket.remove([path]);
      throw error;
    }
    await this.removeAvatarFiles(path).catch(() => undefined);
    this.changed();
    return path;
  }

  /** Back to initials. */
  async clearAvatar() {
    const { error } = await this.sb.client.from('profiles').update({ avatar_url: null }).eq('id', this.sb.userId);
    if (error) throw error;
    await this.removeAvatarFiles().catch(() => undefined);
    this.changed();
  }

  /** Tidies my folder in the bucket; failures only leave an unused file behind. */
  private async removeAvatarFiles(keep?: string) {
    const id = this.sb.userId;
    const bucket = this.sb.client.storage.from('avatars');
    const { data } = await bucket.list(id);
    const old = (data ?? []).map((f) => `${id}/${f.name}`).filter((p) => p !== keep);
    if (old.length) await bucket.remove(old);
  }

  /** Permanent. Rounds I host with others in them pass to the next player; the rest goes. */
  async deleteAccount() {
    await this.removeAvatarFiles().catch(() => undefined);
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
    this.changed();
  }
}
