import { Component, inject, input, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sunny, partlySunny, cloudy, rainy, snow, thunderstorm, calendarOutline, chatbubblesOutline } from 'ionicons/icons';
import { RoundsService } from '../../core/rounds.service';
import { SupabaseService } from '../../core/supabase.service';
import { FriendsService } from '../../core/friends.service';
import { WeatherService, TeeWeather } from '../../core/weather.service';
import { addToCalendar, ROUND_MINUTES } from '../../core/calendar';
import { FriendStatus, RoundDetail } from '../../core/models';
import { AvatarComponent } from '../../core/avatar.component';
import { PlayerMenuComponent } from '../../core/player-menu.component';
import { inviteUrl } from '../../core/app-links';

const WEATHER_ICON: Record<TeeWeather['kind'], string> = {
  clear: 'sunny', cloudy: 'partly-sunny', fog: 'cloudy', rain: 'rainy', snow: 'snow', storm: 'thunderstorm'
};

@Component({
  selector: 'app-round-detail',
  imports: [AvatarComponent, PlayerMenuComponent, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner, IonIcon],
  styles: [`
    .hero { display: block; width: 100%; height: 210px; object-fit: cover; background: var(--pp-rule-soft); }
    .sheet { position: relative; margin-top: -22px; border-radius: 22px 22px 0 0; background: var(--pp-bg); display: flex; flex-direction: column; gap: 22px; }
    h1 { font-size: 38px; margin: 0; }
    .player { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 8px 14px; border-bottom: 1px solid var(--pp-rule-soft); }
    .player:last-child { border-bottom: 0; }
    /* Name with the handicap under it, so a long German button label still fits beside them */
    .who { flex: 1; min-width: 0; display: flex; align-items: center; }
    .who .name { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
    .player-actions { flex: none; display: flex; align-items: center; gap: 8px; }
    .wx { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
    .wx ion-icon { font-size: 20px; color: var(--pp-accent); flex: none; }
    .notice { margin: 0; padding: 12px 14px; border-radius: var(--pp-radius-control); background: var(--pp-deep-soft); color: var(--pp-ink); }
    .actions { display: flex; gap: 10px; }
    .actions ion-button { flex: 1; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/tabs/rounds" [text]="t('tabs.rounds')"></ion-back-button></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      @if (round(); as r) {
        <img class="hero" src="course-placeholder.jpg" alt="">
        <div class="page-pad sheet" style="padding-top: 22px">
          @if (cancelled()) {
            <p role="status" style="margin: 0; padding: 12px 14px; border-radius: var(--pp-radius-control); background: var(--pp-accent-soft); color: var(--pp-accent-ink); font-weight: 600">{{ t('round.cancelled') }}</p>
          } @else if (myStatus() === 'invited') {
            <p role="status" class="notice">{{ t('round.invitedBy', { name: r.host.display_name }) }}</p>
          } @else if (myStatus() === 'requested') {
            <p role="status" class="notice">{{ t('round.requestedNotice', { name: r.host.display_name }) }}</p>
          } @else if (myStatus() === 'waitlisted') {
            <p role="status" class="notice">{{ waitlistPos() ? t('round.waitlistPos', { n: waitlistPos()! }) : t('round.onWaitlist') }}</p>
          }
          <h1>{{ i18n.date(r.tee_time, 'longDay') }}</h1>

          <div class="pp-group">
            <div class="group-row"><span class="txt">{{ t('round.teeTime') }}</span><span class="val">{{ i18n.date(r.tee_time, 'time') }}</span></div>
            <div class="group-row"><span class="txt">{{ t('round.course') }}</span><span class="val" style="flex: 0 1 auto; overflow-wrap: anywhere">{{ r.courses.name }}</span></div>
            <div class="group-row"><span class="txt">{{ t('round.host') }}</span><span class="val">{{ r.host.display_name }}</span></div>
            <div class="group-row"><span class="txt"><span>{{ t('format.label') }}</span><small>{{ t('format.hint.' + (r.format || 'casual')) }}</small></span><span class="val">{{ t('format.' + (r.format || 'casual')) }}</span></div>
            @if (r.cart) {
              <div class="group-row"><span class="txt">{{ t('cart.label') }}</span><span class="val">{{ t('cart.' + r.cart) }}</span></div>
            }
            @if (r.women_only) {
              <div class="group-row"><span class="txt">{{ t('womenOnly.label') }}</span><span class="val">&#10003;</span></div>
            }
            @if (weather(); as w) {
              <div class="group-row" role="group" [attr.aria-label]="t('weather.label')">
                <span class="txt"><span>{{ t('weather.label') }}</span><small>{{ t('weather.detail', { rain: w.rainChance, wind: w.wind }) }}</small></span>
                <span class="val wx"><ion-icon [name]="weatherIcon(w)" aria-hidden="true"></ion-icon>{{ t('weather.' + w.kind) }} · {{ w.temp }}°C</span>
              </div>
            }
          </div>

          @if (inLineUp() && !cancelled()) {
            <div class="actions">
              <ion-button fill="outline" [routerLink]="['/round', r.id, 'chat']"><ion-icon slot="start" name="chatbubbles-outline"></ion-icon>{{ t('chat.open') }}</ion-button>
              @if (!started()) {
                <ion-button fill="outline" (click)="calendar()"><ion-icon slot="start" name="calendar-outline"></ion-icon>{{ t('round.calendar') }}</ion-button>
              }
            </div>
          }

          <div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px">
              <h2 class="section-title">{{ t('round.whoPlays') }}</h2>
              <span class="muted" style="font-size: 14px">{{ t('home.inCount', { n: confirmed().length, max: r.max_players }) }}</span>
            </div>
            <div class="pp-group">
              @for (p of confirmed(); track p.player_id) {
                <div class="player">
                  <span class="who">
                    <app-avatar [name]="p.profiles.display_name" [path]="p.profiles.avatar_url" [size]="36" style="margin-right: 10px; flex: none" />
                    <span class="name">
                      <span>{{ p.profiles.display_name }}{{ p.status === 'host' ? ' ' + t('round.hostTag') : '' }}</span>
                      @if (p.profiles.handicap_index !== null) {
                        <span class="muted" style="font-size: 13px; white-space: nowrap">{{ t('common.hcp', { hcp: p.profiles.handicap_index }) }}</span>
                      }
                    </span>
                  </span>
                  <span class="player-actions">
                    @if (p.player_id !== me()) {
                      @switch (friendStatus().get(p.player_id) ?? 'none') {
                        @case ('friends') { <span class="pill ok">{{ t('round.friend') }}</span> }
                        @case ('requested') { <span class="pill full">{{ t('friends.requested') }}</span> }
                        @case ('incoming') { <ion-button size="small" fill="outline" [disabled]="busy()" (click)="addFriend(p.player_id)" [attr.aria-label]="t('round.acceptFrom', { name: p.profiles.display_name })">{{ t('friends.accept') }}</ion-button> }
                        @default { <ion-button size="small" fill="outline" [disabled]="busy()" (click)="addFriend(p.player_id)" [attr.aria-label]="t('round.addAs', { name: p.profiles.display_name })">{{ t('round.addFriend') }}</ion-button> }
                      }
                      <app-player-menu [playerId]="p.player_id" [name]="p.profiles.display_name" [roundId]="r.id" (blocked)="load()" style="margin-right: -10px" />
                    }
                  </span>
                </div>
              }
              @for (i of emptySpots(); track i) {
                <div class="player muted"><span>{{ t('round.openSpot') }}</span></div>
              }
            </div>
          </div>

          @if (isHost() && requests().length && !cancelled()) {
            <div>
              <h2 class="section-title">{{ t('round.requests', { count: requests().length }) }}</h2>
              <div class="pp-group">
                @for (p of requests(); track p.player_id) {
                  <div class="player">
                    <span class="who">
                      <app-avatar [name]="p.profiles.display_name" [path]="p.profiles.avatar_url" [size]="36" style="margin-right: 10px; flex: none" />
                      <span class="name">
                        <span>{{ p.profiles.display_name }}</span>
                        @if (p.profiles.handicap_index !== null) {
                          <span class="muted" style="font-size: 13px; white-space: nowrap">{{ t('common.hcp', { hcp: p.profiles.handicap_index }) }}</span>
                        }
                      </span>
                    </span>
                    <span class="player-actions">
                      <ion-button size="small" fill="clear" color="medium" [disabled]="busy()" (click)="respond(p.player_id, false)"
                                  [attr.aria-label]="t('round.declineFrom', { name: p.profiles.display_name })">{{ t('round.declineRequest') }}</ion-button>
                      <ion-button size="small" [disabled]="busy() || spotsLeft() <= 0 || started()" (click)="respond(p.player_id, true)"
                                  [attr.aria-label]="t('round.letIn', { name: p.profiles.display_name })">{{ t('round.acceptRequest') }}</ion-button>
                    </span>
                  </div>
                }
              </div>
              @if (spotsLeft() <= 0) { <p class="muted" style="margin: 8px 2px 0; font-size: 13px">{{ t('round.requestsFull') }}</p> }
            </div>
          }

          @if (isHost() && (waitlist().length || invited().length)) {
            <div>
              @if (waitlist().length) {
                <h2 class="section-title">{{ t('round.waitlist', { count: waitlist().length }) }}</h2>
                <div class="pp-group" style="margin-bottom: 18px">
                  @for (p of waitlist(); track p.player_id; let i = $index) {
                    <div class="player"><span style="display: flex; align-items: center"><app-avatar [name]="p.profiles.display_name" [path]="p.profiles.avatar_url" [size]="32" style="margin-right: 10px" />{{ i + 1 }}. {{ p.profiles.display_name }}</span></div>
                  }
                </div>
              }
              @if (invited().length) {
                <h2 class="section-title">{{ t('round.invitedList') }}</h2>
                <div class="pp-group">
                  @for (p of invited(); track p.player_id) {
                    <div class="player"><span style="display: flex; align-items: center"><app-avatar [name]="p.profiles.display_name" [path]="p.profiles.avatar_url" [size]="32" style="margin-right: 10px" />{{ p.profiles.display_name }}</span><span class="pill full">{{ t('round.invitedPill') }}</span></div>
                  }
                </div>
              }
            </div>
          }

          @if (r.notes) {
            <div><h2 class="section-title">{{ t('round.notes') }}</h2><p style="margin: 0 2px; color: var(--pp-ink2)">{{ r.notes }}</p></div>
          }

          @if (!cancelled() && inLineUp()) {
            <ion-button expand="block" [routerLink]="['/scorecard/new']" [queryParams]="{ round: r.id }">{{ t('round.scorecard') }}</ion-button>
          }

          @if (isHost() && !cancelled()) {
            <ion-button fill="outline" expand="block" (click)="share()">{{ copied() ? t('round.copied') : t('round.share') }}</ion-button>
            <ion-button fill="clear" color="medium" expand="block" [disabled]="busy()" (click)="deleteRound()">
              {{ confirmDelete() ? (confirmed().length > 1 ? t('round.deleteConfirmPlayers') : t('round.deleteConfirm')) : t('round.delete') }}
            </ion-button>
          }

          @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }
        </div>
      } @else if (loading()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else {
        <p role="alert" class="page-pad" style="color: var(--pp-accent-ink)">{{ error() || t('round.gone') }}</p>
      }
    </ion-content>

    @if (round() && !isHost() && !cancelled()) {
      <div style="padding: 14px 18px 28px; background: var(--pp-bg); border-top: 1px solid var(--pp-rule); display: flex; flex-direction: column; gap: 8px">
        @if (started()) {
          <p class="muted" style="margin: 0; text-align: center">{{ t('round.started') }}</p>
        } @else if (myStatus() === 'confirmed') {
          <ion-button expand="block" color="medium" fill="outline" [disabled]="busy()" (click)="leave()">{{ t('round.leave') }}</ion-button>
        } @else if (myStatus() === 'waitlisted') {
          <ion-button expand="block" color="medium" fill="outline" [disabled]="busy()" (click)="leave()">{{ t('round.leaveWaitlist') }}</ion-button>
        } @else if (myStatus() === 'requested') {
          <ion-button expand="block" color="medium" fill="outline" [disabled]="busy()" (click)="leave()">{{ t('round.withdrawRequest') }}</ion-button>
        } @else {
          <ion-button expand="block" [disabled]="busy() || (round()!.status !== 'open' && round()!.status !== 'full')" (click)="join()">
            {{ spotsLeft() <= 0 ? t('round.joinWaitlist') : t('round.join') }}
          </ion-button>
          @if (spotsLeft() <= 0) { <p class="muted" style="margin: 0; text-align: center; font-size: 13px">{{ t('round.waitlistHint') }}</p> }
          @if (myStatus() === 'invited') {
            <ion-button expand="block" fill="clear" color="medium" [disabled]="busy()" (click)="leave()">{{ t('round.decline') }}</ion-button>
          }
        }
      </div>
    }
  `
})
export class RoundDetailPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  /** Bound from the route parameter :id (withComponentInputBinding). */
  id = input.required<string>();

  private rounds = inject(RoundsService);
  private sb = inject(SupabaseService);
  private router = inject(Router);
  private friends = inject(FriendsService);
  private weatherService = inject(WeatherService);

  round = signal<RoundDetail | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  copied = signal(false);
  confirmDelete = signal(false);
  friendStatus = signal<Map<string, FriendStatus>>(new Map());
  weather = signal<TeeWeather | null>(null);
  waitlistPos = signal<number | null>(null);
  private coords: { lat: number; lng: number } | null = null;
  me = computed(() => this.sb.session()?.user.id);
  cancelled = computed(() => this.round()?.status === 'cancelled');

  isHost = computed(() => this.round()?.host_id === this.sb.session()?.user.id);
  confirmed = computed(() => this.round()?.round_players.filter((p) => p.status === 'host' || p.status === 'confirmed') ?? []);
  /** Only the host can see these rows (RLS). In joining order. */
  waitlist = computed(() => (this.round()?.round_players.filter((p) => p.status === 'waitlisted') ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  invited = computed(() => this.round()?.round_players.filter((p) => p.status === 'invited') ?? []);
  /** Players who asked to join (e.g. after first saying no to an invite). The host decides. Oldest first. */
  requests = computed(() => (this.round()?.round_players.filter((p) => p.status === 'requested') ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  /** Past the tee time: no joining or leaving. Checked on load, which is enough for a detail page. */
  started = computed(() => !!this.round() && new Date(this.round()!.tee_time).getTime() <= Date.now());
  spotsLeft = computed(() => (this.round()?.max_players ?? 0) - this.confirmed().length);
  emptySpots = computed(() => Array.from({ length: Math.max(0, this.spotsLeft()) }, (_, i) => i));
  myStatus = computed(() => this.round()?.round_players.find((p) => p.player_id === this.sb.session()?.user.id)?.status ?? null);
  inLineUp = computed(() => this.isHost() || this.myStatus() === 'confirmed');

  constructor() {
    addIcons({ sunny, partlySunny, cloudy, rainy, snow, thunderstorm, calendarOutline, chatbubblesOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    try {
      const round = await this.rounds.getRound(this.id());
      this.round.set(round);
      this.friendStatus.set(await this.friends.statuses(round.round_players.map((p) => p.player_id)));
      this.waitlistPos.set(this.myStatus() === 'waitlisted' ? await this.rounds.waitlistPosition(round.id).catch(() => null) : null);
      this.loadWeather(round);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'round.loadError'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Extra, so it never holds up the page or shows an error. */
  private async loadWeather(r: RoundDetail) {
    if (r.status === 'cancelled') return;
    try {
      if (!this.coords) {
        const c = await this.rounds.getCourse(r.courses.id);
        if (!c) return;
        this.coords = { lat: c.lat, lng: c.lng };
      }
      this.weather.set(await this.weatherService.atTeeTime(this.coords.lat, this.coords.lng, r.tee_time));
    } catch { /* no weather, no fuss */ }
  }

  weatherIcon(w: TeeWeather) {
    return WEATHER_ICON[w.kind];
  }

  private async run(fn: () => Promise<unknown>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await fn();
      await this.load();
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'common.error'));
      await this.load(); // the round may have changed under us (e.g. now full)
    } finally {
      this.busy.set(false);
    }
  }

  /** Sends a request, or accepts theirs if they asked first. */
  addFriend(playerId: string) { return this.run(() => this.friends.add(playerId)); }

  /** Joins, or goes on the waitlist if the round is full. */
  join() { return this.run(() => this.rounds.join(this.id())); }
  /** Host: accepts or turns down a request to join. */
  respond(playerId: string, accept: boolean) { return this.run(() => this.rounds.respond(this.id(), playerId, accept)); }
  /** Leaves the line-up, steps off the waitlist, withdraws a request, or says no to an invite. */
  leave() { return this.run(() => this.rounds.leave(this.id())); }

  async calendar() {
    const r = this.round();
    if (!r) return;
    const start = new Date(r.tee_time);
    const players = this.confirmed().map((p) => p.profiles.display_name).join(', ');
    try {
      await addToCalendar({
        title: this.t('round.calendarTitle', { course: r.courses.name }),
        start,
        end: new Date(start.getTime() + ROUND_MINUTES * 60_000),
        location: [r.courses.name, r.courses.city].filter(Boolean).join(', '),
        description: this.t('round.calendarText', { players })
      });
    } catch {
      this.error.set(this.t('round.calendarError'));
    }
  }

  /** Takes a second tap, since joined players lose their spot. */
  async deleteRound() {
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      setTimeout(() => this.confirmDelete.set(false), 4000);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.rounds.deleteRound(this.id());
      await this.router.navigateByUrl('/tabs/rounds', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'round.deleteError'));
    } finally {
      this.busy.set(false);
      this.confirmDelete.set(false);
    }
  }

  async share() {
    const r = this.round();
    if (!r) return;
    let code: string | null;
    try {
      code = await this.rounds.inviteCode(r.id);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'common.error'));
      return;
    }
    if (!code) return;
    const url = inviteUrl(code); // the website, not this page's address (that's https://localhost inside the app)
    if (navigator.share) {
      await navigator.share({ title: this.t('round.shareTitle'), text: this.t('round.shareText', { course: r.courses.name }), url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
