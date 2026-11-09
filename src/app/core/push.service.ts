import { Injectable, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';
import { I18nService } from './i18n.service';
import { NotificationsService } from './notifications.service';

const ASKED = 'pp.pushAsked';

/**
 * Push notifications on the phone (Firebase Cloud Messaging on Android).
 * The server side is the push Edge Function, called for every new row in `notifications`.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private sb = inject(SupabaseService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private notifications = inject(NotificationsService);

  private started = false;
  private token: string | null = null;

  /** Native app with Firebase set up. */
  get available() {
    return environment.pushEnabled && Capacitor.isNativePlatform();
  }

  /** Called once the player is signed in and onboarded (from the tabs page). Asks for permission the first time only. */
  async start() {
    if (!this.available || this.started) return;
    this.started = true;

    await PushNotifications.addListener('registration', ({ value }) => {
      this.token = value;
      this.save();
    });
    await PushNotifications.addListener('registrationError', (e) => console.warn('Push registration failed', e));
    // Tapped a notification: open what it's about
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      this.router.navigateByUrl(notification.data?.route || '/notifications');
    });
    // Arrived while the app is open: just update the bell
    await PushNotifications.addListener('pushNotificationReceived', () => this.notifications.refreshUnread());

    await PushNotifications.createChannel({
      id: 'default', name: this.i18n.t('push.channel'), description: this.i18n.t('push.channelText'), importance: 4, visibility: 1
    }).catch(() => {});

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      if (this.wasAsked()) return;
      this.markAsked();
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') await PushNotifications.register();
  }

  constructor() {
    // Pushes are written in the app's language: tell the server when it changes,
    // and when someone signs in on this phone (it may be a different account than before)
    effect(() => {
      this.i18n.lang();
      this.sb.session()?.user.id;
      untracked(() => this.save());
    });
  }

  /** Before signing out: this phone stops getting the account's pushes. */
  async stop() {
    if (!this.token) return;
    await this.sb.client.rpc('unregister_device', { p_token: this.token }).then(() => {}, () => {});
  }

  private save() {
    if (!this.token || !this.sb.session()) return;
    this.sb.client.rpc('register_device', { p_token: this.token, p_platform: Capacitor.getPlatform(), p_locale: this.i18n.lang() })
      .then(({ error }) => { if (error) console.warn('Could not save push token', error); });
  }

  private wasAsked() {
    try { return localStorage.getItem(ASKED) === '1'; } catch { return false; }
  }

  private markAsked() {
    try { localStorage.setItem(ASKED, '1'); } catch { /* fine: we may ask again next time */ }
  }
}
