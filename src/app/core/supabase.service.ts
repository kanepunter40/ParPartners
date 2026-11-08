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

  /** Public URL of a profile picture from its storage path (profiles.avatar_url), or null. */
  avatarUrl(path: string | null | undefined): string | null {
    return path ? this.client.storage.from('avatars').getPublicUrl(path).data.publicUrl : null;
  }

  /** `signup` to confirm a new account, `recovery` for a password reset. */
  verifyEmailCode(email: string, token: string, type: 'signup' | 'recovery') {
    return this.client.auth.verifyOtp({ email, token, type });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  /** Returns a session straight away if email confirmation is off; otherwise a code is emailed. */
  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
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
    return this.client.auth.signOut();
  }
}
