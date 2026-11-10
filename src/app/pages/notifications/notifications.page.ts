import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { NotificationsService } from '../../core/notifications.service';
import { RoundsService } from '../../core/rounds.service';
import { AppNotification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonRefresher, IonRefresherContent],
  styles: [`
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .row { display: flex; gap: 12px; align-items: flex-start; min-height: 64px; padding: 14px 16px; border-bottom: 1px solid #EFEAD9; text-decoration: none; color: inherit; }
    .row:last-child { border-bottom: 0; }
    .row.unread { background: #E3ECE9; }
    .dot { flex: none; width: 8px; height: 8px; margin-top: 7px; border-radius: 999px; background: transparent; }
    .unread .dot { background: #C97B4A; }
    .text { display: flex; flex-direction: column; gap: 3px; }
    .row.free { align-items: center; }
    .row.free .text { flex: 1; min-width: 0; }
    .row.free a { color: inherit; text-decoration: none; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('notifications.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad">
        @if (error()) { <p role="alert" style="color: #9C5428">{{ error() }}</p> }
        @if (items().length) {
          <div class="card">
            @for (n of items(); track n.id) {
              @if (n.type === 'player_free') {
                <!-- Not one big link: it holds an Invite button for the host's round -->
                <div class="row free" [class.unread]="!n.read_at">
                  <span class="dot" aria-hidden="true"></span>
                  <span class="text">
                    <span>@if (!n.read_at) { <span class="sr-only">{{ t('notifications.new') }} </span> }{{ message(n) }}</span>
                    @if (n.rounds; as r) {
                      <a class="muted" style="font-size: 13px" [routerLink]="['/round', n.round_id]">{{ r.courses.name }} · {{ i18n.date(r.tee_time) }}</a>
                    }
                    <span class="muted" style="font-size: 12px">{{ i18n.ago(n.created_at) }}</span>
                  </span>
                  @if (invited().has(n.id)) {
                    <span class="pill ok">{{ t('free.invited') }}</span>
                  } @else if (n.rounds && n.actor_id) {
                    <ion-button size="small" [disabled]="busy() === n.id" (click)="invite(n)"
                                [attr.aria-label]="t('notifications.inviteLabel', { who: n.actor?.display_name ?? t('notifications.aPlayer') })">{{ t('free.invite') }}</ion-button>
                  }
                </div>
              } @else {
              <a class="row" [class.unread]="!n.read_at" [routerLink]="link(n)">
                <span class="dot" aria-hidden="true"></span>
                <span class="text">
                  <span>@if (!n.read_at) { <span class="sr-only">{{ t('notifications.new') }} </span> }{{ message(n) }}</span>
                  @if (n.detail) { <span style="font-size: 14px; overflow-wrap: anywhere">“{{ n.detail }}”</span> }
                  @if (n.rounds; as r) {
                    <span class="muted" style="font-size: 13px">{{ r.courses.name }} · {{ i18n.date(r.tee_time) }}</span>
                  }
                  <span class="muted" style="font-size: 12px">{{ i18n.ago(n.created_at) }}</span>
                </span>
              </a>
              }
            }
          </div>
        } @else if (loaded()) {
          <div style="text-align: center; padding: 64px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
            <h2 style="margin: 0">{{ t('notifications.emptyTitle') }}</h2>
            <p class="muted" style="margin: 0">{{ t('notifications.emptyText') }}</p>
          </div>
        }
      </div>
    </ion-content>
  `
})
export class NotificationsPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private notifications = inject(NotificationsService);
  private rounds = inject(RoundsService);
  items = signal<AppNotification[]>([]);
  /** player_free notifications whose player was invited from here */
  invited = signal(new Set<string>());
  busy = signal<string | null>(null);
  loaded = signal(false);
  error = signal('');

  ionViewWillEnter() {
    this.load();
  }

  /** Shows the list with unread ones highlighted, then marks them read for next time. */
  async load() {
    this.error.set('');
    try {
      this.items.set(await this.notifications.list());
      if (this.items().some((n) => !n.read_at)) await this.notifications.markAllRead();
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'notifications.loadError'));
    } finally {
      this.loaded.set(true);
    }
  }

  async refresh(ev: Event) {
    await this.load();
    (ev as CustomEvent).detail.complete?.() ?? (ev.target as any).complete();
  }

  link(n: AppNotification): string[] | null {
    if (n.type === 'friend_request' || n.type === 'friend_accepted') return ['/friends'];
    if (n.type === 'round_message' && n.round_id) return ['/round', n.round_id, 'chat'];
    if (n.type === 'free_alert') return ['/tabs/find'];
    return n.round_id ? ['/round', n.round_id] : null;
  }

  message(n: AppNotification): string {
    const who = n.actor?.display_name ?? this.t('notifications.aPlayer');
    const known = ['request_received', 'request_accepted', 'request_declined', 'player_joined', 'player_left',
                   'round_cancelled', 'friend_request', 'friend_accepted', 'host_handover', 'round_reminder', 'report_received',
                   'round_alert', 'round_invite', 'round_message', 'waitlist_promoted', 'player_free', 'free_alert'];
    const day = n.day ? this.dayLabel(n.day) : '';
    return this.t(known.includes(n.type) ? `notifications.type.${n.type}` : 'notifications.type.other', { who, day });
  }

  /** "Saturday 15 Nov" for a YYYY-MM-DD day. */
  private dayLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  /** Invites the free player to the host's round the notification is about. */
  async invite(n: AppNotification) {
    if (!n.round_id || !n.actor_id) return;
    this.busy.set(n.id);
    this.error.set('');
    try {
      await this.rounds.invite(n.round_id, n.actor_id);
      this.invited.update((s) => new Set(s).add(n.id));
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'free.inviteError'));
    } finally {
      this.busy.set(null);
    }
  }
}
