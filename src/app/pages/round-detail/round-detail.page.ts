import { Component, inject, input, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { SupabaseService } from '../../core/supabase.service';
import { FriendsService } from '../../core/friends.service';
import { FriendStatus, RoundDetail } from '../../core/models';
import { AvatarComponent } from '../../core/avatar.component';
import { PlayerMenuComponent } from '../../core/player-menu.component';

@Component({
  selector: 'app-round-detail',
  imports: [AvatarComponent, PlayerMenuComponent, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner],
  styles: [`
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .player { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 6px 16px; border-bottom: 1px solid #EFEAD9; }
    .player:last-child { border-bottom: 0; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/tabs/rounds" [text]="t('tabs.rounds')"></ion-back-button></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      @if (round(); as r) {
        <div class="page-pad" style="display: flex; flex-direction: column; gap: 20px">
          @if (cancelled()) {
            <p role="status" style="margin: 0; padding: 12px 16px; border-radius: 12px; background: #F3E4D6; color: #9C5428; font-weight: 600">{{ t('round.cancelled') }}</p>
          }
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em">{{ isHost() ? t('rounds.hostedByYou') : t('home.hostedBy', { name: r.host.display_name }) }}</div>
            <h2 style="font-size: 26px; margin: 6px 0">{{ r.courses.name }}</h2>
            <div class="muted">{{ i18n.date(r.tee_time, 'longDayTime') }}</div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
              <strong>{{ t('round.players') }}</strong>
              <span class="muted">{{ t('home.inCount', { n: confirmed().length, max: r.max_players }) }}</span>
            </div>
            <div class="card">
              @for (p of confirmed(); track p.player_id) {
                <div class="player">
                  <span style="display: flex; align-items: center"><app-avatar [name]="p.profiles.display_name" [path]="p.profiles.avatar_url" [size]="36" style="margin-right: 10px" />{{ p.profiles.display_name }}{{ p.status === 'host' ? ' ' + t('round.hostTag') : '' }}</span>
                  <span style="display: flex; align-items: center; gap: 8px">
                    <span class="muted" style="font-size: 13px">{{ p.profiles.handicap_index !== null ? t('common.hcp', { hcp: p.profiles.handicap_index }) : '' }}</span>
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

          @if (r.notes) {
            <div><strong>{{ t('round.notes') }}</strong><p class="muted" style="margin: 6px 0 0">{{ r.notes }}</p></div>
          }

          @if (!cancelled() && (isHost() || myStatus() === 'confirmed')) {
            <ion-button expand="block" [routerLink]="['/scorecard/new']" [queryParams]="{ round: r.id }">{{ t('round.scorecard') }}</ion-button>
          }

          @if (isHost() && !cancelled()) {
            <ion-button fill="outline" expand="block" (click)="share()">{{ copied() ? t('round.copied') : t('round.share') }}</ion-button>
            <ion-button fill="clear" color="medium" expand="block" [disabled]="busy()" (click)="deleteRound()">
              {{ confirmDelete() ? (confirmed().length > 1 ? t('round.deleteConfirmPlayers') : t('round.deleteConfirm')) : t('round.delete') }}
            </ion-button>
          }

          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }
        </div>
      } @else if (loading()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else {
        <p role="alert" class="page-pad" style="color: #9C5428">{{ error() || t('round.gone') }}</p>
      }
    </ion-content>

    @if (round() && !isHost() && !cancelled()) {
      <div style="padding: 14px 24px 28px; background: #F4F1E8; border-top: 1px solid #E6DFC9">
        @if (started()) {
          <p class="muted" style="margin: 0; text-align: center">{{ t('round.started') }}</p>
        } @else if (myStatus() === 'confirmed') {
          <ion-button expand="block" color="medium" fill="outline" [disabled]="busy()" (click)="leave()">{{ t('round.leave') }}</ion-button>
        } @else {
          <ion-button expand="block" [disabled]="busy() || spotsLeft() <= 0 || round()!.status !== 'open'" (click)="join()">
            {{ spotsLeft() <= 0 ? t('round.full') : t('round.join') }}
          </ion-button>
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

  round = signal<RoundDetail | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  copied = signal(false);
  confirmDelete = signal(false);
  friendStatus = signal<Map<string, FriendStatus>>(new Map());
  me = computed(() => this.sb.session()?.user.id);
  cancelled = computed(() => this.round()?.status === 'cancelled');

  isHost = computed(() => this.round()?.host_id === this.sb.session()?.user.id);
  confirmed = computed(() => this.round()?.round_players.filter((p) => p.status === 'host' || p.status === 'confirmed') ?? []);
  /** Past the tee time: no joining or leaving. Checked on load, which is enough for a detail page. */
  started = computed(() => !!this.round() && new Date(this.round()!.tee_time).getTime() <= Date.now());
  spotsLeft = computed(() => (this.round()?.max_players ?? 0) - this.confirmed().length);
  emptySpots = computed(() => Array.from({ length: Math.max(0, this.spotsLeft()) }, (_, i) => i));
  myStatus = computed(() => this.round()?.round_players.find((p) => p.player_id === this.sb.session()?.user.id)?.status ?? null);

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    try {
      const round = await this.rounds.getRound(this.id());
      this.round.set(round);
      this.friendStatus.set(await this.friends.statuses(round.round_players.map((p) => p.player_id)));
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'round.loadError'));
    } finally {
      this.loading.set(false);
    }
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

  join() { return this.run(() => this.rounds.join(this.id())); }
  leave() { return this.run(() => this.rounds.leave(this.id())); }

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
    const url = `${window.location.origin}/join/${r.invite_code}`;
    if (navigator.share) {
      await navigator.share({ title: this.t('round.shareTitle'), text: this.t('round.shareText', { course: r.courses.name }), url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
