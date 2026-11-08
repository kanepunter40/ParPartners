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

  /** Passwordless: emails a sign-in code (and link). Also creates the account for a new email. */
  signInWithEmail(email: string) {
    return this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  }

  /** `email` for sign-in codes, `signup` to confirm a new account, `recovery` for a password reset. */
  verifyEmailCode(email: string, token: string, type: 'email' | 'signup' | 'recovery' = 'email') {
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
