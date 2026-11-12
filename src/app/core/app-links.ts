import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** The public website. Invite links point here; on a phone with the app, Android opens them in the app. */
export const SITE_URL = 'https://parpartners.app';

/** A link to join a round by its invite code. */
export function inviteUrl(code: string) {
  return `${SITE_URL}/join/${encodeURIComponent(code)}`;
}

/**
 * Android App Links: tapping https://parpartners.app/join/<code> opens the app (see the intent filter in
 * AndroidManifest.xml and site/.well-known/assetlinks.json) and lands on the join screen, whether the
 * app was already running or is being started by the link.
 */
@Injectable({ providedIn: 'root' })
export class AppLinksService {
  private router = inject(Router);
  private zone = inject(NgZone);
  private lastHandled = '';

  /** Call once at start-up. */
  async listen() {
    if (!Capacitor.isNativePlatform()) return;
    App.addListener('appUrlOpen', ({ url }) => this.open(url));
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) this.open(launch.url);
    } catch { /* no launch link */ }
  }

  private open(url: string) {
    const path = appPath(url);
    if (!path || path === this.lastHandled) return; // the launch link can also arrive as appUrlOpen
    this.lastHandled = path;
    this.zone.run(() => this.router.navigateByUrl(path));
  }
}

/** "/join/ABC123" for a link to our site that the app can show, otherwise null. */
function appPath(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || (u.hostname !== 'parpartners.app' && u.hostname !== 'www.parpartners.app')) return null;
  const m = u.pathname.match(/^\/join\/([A-Za-z0-9_-]{1,64})\/?$/);
  return m ? `/join/${m[1]}` : null;
}
