import { Component, inject, input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { SupabaseService } from '../../core/supabase.service';
import { RoundDetail } from '../../core/models';

@Component({
  selector: 'app-round-detail',
  imports: [DatePipe, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonSpinner],
  styles: [`
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .player { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 6px 16px; border-bottom: 1px solid #EFEAD9; }
    .player:last-child { border-bottom: 0; }
    .avatar { width: 36px; height: 36px; border-radius: 999px; background: #2E5F5A; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; margin-right: 10px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/tabs/rounds" text="Rounds"></ion-back-button></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      @if (round(); as r) {
        <div class="page-pad" style="display: flex; flex-direction: column; gap: 20px">
          @if (cancelled()) {
            <p role="status" style="margin: 0; padding: 12px 16px; border-radius: 12px; background: #F3E4D6; color: #9C5428; font-weight: 600">This round was cancelled by the host.</p>
          }
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em">Hosted by {{ isHost() ? 'you' : r.host.display_name }}</div>
            <h2 style="font-size: 26px; margin: 6px 0">{{ r.courses.name }}</h2>
            <div class="muted">{{ r.tee_time | date: 'EEEE, d MMMM · HH:mm' }}</div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
              <strong>Players</strong>
              <span class="muted">{{ confirmed().length }} of {{ r.max_players }} in</span>
            </div>
            <div class="card">
              @for (p of confirmed(); track p.player_id) {
                <div class="player">
                  <span style="display: flex; align-items: center"><span class="avatar">{{ initials(p.profiles.display_name) }}</span>{{ p.profiles.display_name }}{{ p.status === 'host' ? ' (host)' : '' }}</span>
                  <span class="muted" style="font-size: 13px">{{ p.profiles.handicap_index !== null ? 'HCP ' + p.profiles.handicap_index : '' }}</span>
                </div>
              }
              @for (i of emptySpots(); track i) {
                <div class="player muted"><span>Open spot</span></div>
              }
            </div>
          </div>

          @if (r.notes) {
            <div><strong>Notes</strong><p class="muted" style="margin: 6px 0 0">{{ r.notes }}</p></div>
          }

          @if (!cancelled() && (isHost() || myStatus() === 'confirmed')) {
            <ion-button expand="block" [routerLink]="['/scorecard/new']" [queryParams]="{ round: r.id }">Scorecard</ion-button>
          }

          @if (isHost() && !cancelled()) {
            <ion-button fill="outline" expand="block" (click)="share()">{{ copied() ? 'Link copied' : 'Share invite link' }}</ion-button>
            <ion-button fill="clear" color="medium" expand="block" [disabled]="busy()" (click)="deleteRound()">
              {{ confirmDelete() ? (confirmed().length > 1 ? 'Tap again to delete. Players will be told' : 'Tap again to delete') : 'Delete round' }}
            </ion-button>
          }

          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }
        </div>
      } @else if (loading()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else {
        <p role="alert" class="page-pad" style="color: #9C5428">{{ error() || 'This round is no longer available.' }}</p>
      }
    </ion-content>

    @if (round() && !isHost() && !cancelled()) {
      <div style="padding: 14px 24px 28px; background: #F4F1E8; border-top: 1px solid #E6DFC9">
        @if (started()) {
          <p class="muted" style="margin: 0; text-align: center">This round has started</p>
        } @else if (myStatus() === 'confirmed') {
          <ion-button expand="block" color="medium" fill="outline" [disabled]="busy()" (click)="leave()">Leave round</ion-button>
        } @else {
          <ion-button expand="block" [disabled]="busy() || spotsLeft() <= 0 || round()!.status !== 'open'" (click)="join()">
            {{ spotsLeft() <= 0 ? 'Round is full' : 'Join round' }}
          </ion-button>
        }
      </div>
    }
  `
})
export class RoundDetailPage {
  /** Bound from the route parameter :id (withComponentInputBinding). */
  id = input.required<string>();

  private rounds = inject(RoundsService);
  private sb = inject(SupabaseService);
  private router = inject(Router);

  round = signal<RoundDetail | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  copied = signal(false);
  confirmDelete = signal(false);
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

  initials(name: string) {
    return name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  }

  async load() {
    try {
      this.round.set(await this.rounds.getRound(this.id()));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load this round.');
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
      this.error.set(e?.message ?? 'Something went wrong.');
      await this.load(); // the round may have changed under us (e.g. now full)
    } finally {
      this.busy.set(false);
    }
  }

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
      this.error.set(e?.message ?? 'Could not delete the round.');
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
      await navigator.share({ title: 'Join my round', text: `Play ${r.courses.name} with me`, url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
