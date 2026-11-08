import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  readonly session = signal<Session | null>(null);
  /** Resolves once the stored session (if any) has been loaded. Guards await this. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  get userId(): string {
    const id = this.session()?.user.id;
    if (!id) throw new Error('Not signed in');
    return id;
  }

  /** Signed links to profile pictures, kept for the session so each picture is fetched (and cached) once. */
  private avatarLinks = new Map<string, { at: number; url: Promise<string | null> }>();

  /**
   * A temporary link to a profile picture (the bucket is private: signed-in players only).
   * Links last 24 hours; a fresh one is asked for after 12.
   */
  avatarUrl(path: string): Promise<string | null> {
    const hit = this.avatarLinks.get(path);
    if (hit && Date.now() - hit.at < 12 * 3600_000) return hit.url;
    const url = this.client.storage.from('avatars').createSignedUrl(path, 24 * 3600)
      .then(({ data }) => data?.signedUrl ?? null)
      .catch(() => null);
    this.avatarLinks.set(path, { at: Date.now(), url });
    return url;
  }

  /** `signup` to confirm a new account, `recovery` for a password reset. */
  verifyEmailCode(email: string, token: string, type: 'signup' | 'recovery') {
    return this.client.auth.verifyOtp({ email, token, type });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  /** Returns a session straight away if email confirmation is off; otherwise a code is emailed. */
  signUp(email: string, password: string, lang: string) {
    return this.client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { lang } } });
  }

  resendSignupCode(email: string) {
    return this.client.auth.resend({ type: 'signup', email });
  }

  sendPasswordReset(email: string) {
    return this.client.auth.resetPasswordForEmail(email);
  }

  setPassword(password: string) {
    return this.client.auth.updateUser({ password });
  }

  signOut() {
    this.avatarLinks.clear();
    return this.client.auth.signOut();
  }
}
