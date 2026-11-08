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

  signInWithEmail(email: string) {
    return this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  }

  verifyEmailCode(email: string, token: string) {
    return this.client.auth.verifyOtp({ email, token, type: 'email' });
  }

  signOut() {
    return this.client.auth.signOut();
  }
}
