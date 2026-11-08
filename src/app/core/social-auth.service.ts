import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

export type SocialProvider = 'google' | 'apple';

/** Where Supabase sends the app back after a browser sign-in. Must be in Supabase Auth > URL Configuration > Redirect URLs. */
const APP_CALLBACK = 'app.parpartners://auth';

async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Google and Apple sign-in.
 *   Android: Google uses the system account picker; Apple opens the browser and comes back via app.parpartners://auth.
 *   iOS:     both use the system sheets (needs the iOS app and an Apple Developer account).
 *   Web:     both redirect through Supabase and back to this site.
 */
@Injectable({ providedIn: 'root' })
export class SocialAuthService {
  private sb = inject(SupabaseService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private ready?: Promise<void>;

  private readonly platform = Capacitor.getPlatform();
  private readonly native = Capacitor.isNativePlatform();

  /** Call once at start-up, so a browser sign-in can hand its session back to the app. */
  listenForCallback() {
    if (!this.native) return;
    App.addListener('appUrlOpen', ({ url }) => {
      if (url.startsWith(APP_CALLBACK)) this.zone.run(() => this.finishFromUrl(url));
    });
  }

  /** Resolves when signed in, or when the page has been handed to the browser (web, Apple on Android). */
  async signIn(provider: SocialProvider): Promise<void> {
    const useSystemSheet = this.platform === 'ios' || (this.platform === 'android' && provider === 'google');
    if (useSystemSheet) return this.signInNatively(provider);

    const { data, error } = await this.sb.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: this.native ? APP_CALLBACK : window.location.origin, skipBrowserRedirect: this.native }
    });
    if (error) throw error;
    // In the app, an outside address opens in the system browser rather than the app's web view
    if (this.native) window.location.href = data.url;
  }

  private async signInNatively(provider: SocialProvider) {
    if (provider === 'google' && !environment.googleWebClientId) throw new Error('Google sign-in isn’t set up yet.');
    this.ready ??= SocialLogin.initialize({
      google: environment.googleWebClientId ? { webClientId: environment.googleWebClientId } : undefined,
      apple: this.platform === 'ios' ? { redirectUrl: '' } : undefined
    }).catch((e) => { this.ready = undefined; throw e; });
    await this.ready;

    // Supabase checks the token's nonce against the hash of the one we hand it
    const nonce = crypto.randomUUID();
    const hashed = await sha256(nonce);
    const res = provider === 'google'
      ? await SocialLogin.login({ provider, options: { nonce: hashed } })
      : await SocialLogin.login({ provider, options: { nonce: hashed, scopes: ['email', 'name'] } });

    const idToken = 'idToken' in res.result ? res.result.idToken : null;
    if (!idToken) throw new Error('Sign-in was cancelled.');
    const { error } = await this.sb.client.auth.signInWithIdToken({ provider, token: idToken, nonce });
    if (error) throw error;
  }

  private async finishFromUrl(url: string) {
    const params = new URLSearchParams(url.split('#')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return; // cancelled in the browser
    const { error } = await this.sb.client.auth.setSession({ access_token, refresh_token });
    if (!error) this.router.navigateByUrl('/tabs', { replaceUrl: true });
  }
}

/** A cancelled sheet is not an error worth showing. */
export function isCancel(e: unknown): boolean {
  return /cancel/i.test((e as Error)?.message ?? '');
}
