import { Component, inject, input, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSegment, IonSegmentButton, IonLabel, IonSpinner } from '@ionic/angular/standalone';
import { ScorecardsService, holeNumbers, formatToPar, HOLES_LABEL } from '../../core/scorecards.service';
import { SupabaseService } from '../../core/supabase.service';
import { Scorecard, ScorecardPlayer } from '../../core/models';

const DEFAULT_PAR = 4;
const POLL_MS = 20_000;

@Component({
  selector: 'app-scorecard',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSegment, IonSegmentButton, IonLabel, IonSpinner],
  styles: [`
    .hole-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .hole-no { font-family: 'Fraunces Variable', serif; font-size: 44px; line-height: 1; margin: 0; }
    .par-btn { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; font: inherit; font-weight: 600; color: #1F3532; }
    .par-btn.unknown { border-style: dashed; color: #5F5B4E; }
    .pars { display: flex; gap: 8px; }
    .pars button { flex: 1; min-height: 48px; border-radius: 12px; border: 1px solid #D9D2BA; background: #fff; font: inherit; font-weight: 600; color: #1F3532; }
    .pars button[aria-pressed="true"] { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .prow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #EFEAD9; }
    .prow:last-child { border-bottom: 0; }
    .pname { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pname strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stepper { display: flex; align-items: center; gap: 6px; flex: none; }
    .stepper .round { width: 48px; height: 48px; border-radius: 999px; border: 1px solid #D9D2BA; background: #F4F1E8; font-size: 22px; color: #1F3532; }
    .stepper .num { width: 56px; height: 56px; border-radius: 14px; border: 2px solid #2E5F5A; background: #fff; font: inherit; font-size: 24px; font-weight: 700; color: #1F3532; }
    .stepper .num.empty { border: 2px dashed #D9D2BA; color: #5F5B4E; font-weight: 500; }
    .under { color: #2E5F5A; }
    .over { color: #9C5428; }
    .nav { display: flex; gap: 10px; padding: 12px 24px 24px; background: #F4F1E8; border-top: 1px solid #E6DFC9; }
    .nav ion-button { flex: 1; }
    .grid-wrap { overflow-x: auto; border: 1px solid #E6DFC9; border-radius: 16px; background: #fff; }
    table { border-collapse: collapse; font-size: 14px; min-width: 100%; }
    th, td { padding: 0; text-align: center; border-bottom: 1px solid #EFEAD9; min-width: 36px; height: 40px; }
    th:first-child, td:first-child { position: sticky; left: 0; background: #fff; text-align: left; padding: 0 12px; min-width: 96px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-right: 1px solid #EFEAD9; }
    tr:last-child td { border-bottom: 0; }
    .sum { background: #F4F1E8; font-weight: 700; }
    .hole-link { width: 100%; height: 40px; border: 0; background: none; font: inherit; font-weight: 600; color: #2E5F5A; }
    .par-row td { color: #5F5B4E; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/scores" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ card()?.courses?.name ?? t('round.scorecard') }}</ion-title>
      </ion-toolbar>
      @if (card()) {
        <ion-toolbar>
          <ion-segment [value]="view()" (ionChange)="view.set($any($event).detail.value)" style="margin: 0 24px; width: auto">
            <ion-segment-button value="hole"><ion-label>{{ t('card.byHole') }}</ion-label></ion-segment-button>
            <ion-segment-button value="card"><ion-label>{{ t('card.full') }}</ion-label></ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      @if (card(); as c) {
        <div class="page-pad" style="display: flex; flex-direction: column; gap: 16px">
          @if (unsaved()) {
            <p role="status" class="muted" style="margin: 0; font-size: 13px">{{ t('card.unsaved', { count: unsaved() }) }}</p>
          }
          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

          @if (view() === 'hole') {
            <div class="hole-head">
              <div>
                <div class="muted" style="font-size: 13px">{{ t('card.nOfM', { n: holeIndex() + 1, m: holes().length }) }}</div>
                <h2 class="hole-no" aria-live="polite">{{ t('card.hole', { n: hole() }) }}</h2>
              </div>
              <button type="button" class="par-btn" [class.unknown]="!parKnown(hole())" [attr.aria-expanded]="editingPar()" (click)="editingPar.set(!editingPar())">
                {{ t('card.par', { par: par(hole()) }) }}{{ parKnown(hole()) ? '' : '?' }}
              </button>
            </div>

            @if (editingPar() || !parKnown(hole())) {
              <div>
                <div class="muted" style="font-size: 13px; margin-bottom: 6px">
                  {{ parKnown(hole()) ? t('card.changePar', { n: hole() }) : t('card.unknownPar') }}
                </div>
                <div class="pars" role="group" [attr.aria-label]="t('card.parFor', { n: hole() })">
                  @for (p of [3, 4, 5, 6]; track p) {
                    <button type="button" [attr.aria-pressed]="parKnown(hole()) && par(hole()) === p" (click)="setPar(p)">{{ p }}</button>
                  }
                </div>
              </div>
            }

            <div class="card">
              @for (p of players(); track p.id) {
                <div class="prow">
                  <span class="pname">
                    <strong>{{ p.name }}{{ p.profile_id === me() ? ' ' + t('cardNew.you') : '' }}</strong>
                    <span class="muted" style="font-size: 13px">{{ summary(p) }}</span>
                  </span>
                  <span class="stepper">
                    <button type="button" class="round" [attr.aria-label]="t('card.fewer', { name: p.name })" (click)="step(p, -1)">&minus;</button>
                    <button type="button" class="num" [class.empty]="strokes(p.id, hole()) === undefined"
                      [attr.aria-label]="strokes(p.id, hole()) === undefined ? t('card.noScoreLabel', { name: p.name, n: hole() }) : t('card.scoreLabel', { name: p.name, n: hole(), count: strokes(p.id, hole())! })"
                      (click)="tapNumber(p)">{{ strokes(p.id, hole()) ?? par(hole()) }}</button>
                    <button type="button" class="round" [attr.aria-label]="t('card.more', { name: p.name })" (click)="step(p, 1)">+</button>
                  </span>
                </div>
              }
            </div>
            <p class="muted" style="margin: 0; font-size: 13px">{{ t('card.hint') }}</p>
          } @else {
            <div class="muted" style="font-size: 13px">{{ i18n.date(c.played_at, 'dayDateYear') }} · {{ holesLabel() }}</div>
            <div class="grid-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{{ t('card.holeCol') }}</th>
                    @for (h of holes(); track h) {
                      <th scope="col"><button type="button" class="hole-link" [attr.aria-label]="t('card.goTo', { n: h })" (click)="goTo(h)">{{ h }}</button></th>
                      @if (h === 9 && c.holes === '18') { <th scope="col" class="sum">{{ t('card.out') }}</th> }
                    }
                    @if (c.holes === '18') { <th scope="col" class="sum">{{ t('card.in') }}</th> }
                    <th scope="col" class="sum">{{ t('card.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="par-row">
                    <td>{{ t('card.parRow') }}</td>
                    @for (h of holes(); track h) {
                      <td>{{ parKnown(h) ? par(h) : '–' }}</td>
                      @if (h === 9 && c.holes === '18') { <td class="sum">{{ parSum(1, 9) }}</td> }
                    }
                    @if (c.holes === '18') { <td class="sum">{{ parSum(10, 18) }}</td> }
                    <td class="sum">{{ parSum(holes()[0], holes()[holes().length - 1]) }}</td>
                  </tr>
                  @for (p of players(); track p.id) {
                    <tr>
                      <td>{{ p.name }}</td>
                      @for (h of holes(); track h) {
                        <td [class.under]="diff(p.id, h) < 0" [class.over]="diff(p.id, h) > 0">{{ strokes(p.id, h) ?? '' }}</td>
                        @if (h === 9 && c.holes === '18') { <td class="sum">{{ sum(p.id, 1, 9) || '' }}</td> }
                      }
                      @if (c.holes === '18') { <td class="sum">{{ sum(p.id, 10, 18) || '' }}</td> }
                      <td class="sum">{{ sum(p.id, holes()[0], holes()[holes().length - 1]) || '' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="card">
              @for (p of players(); track p.id) {
                <div class="prow" style="min-height: 52px">
                  <strong>{{ p.name }}</strong>
                  <span>{{ summary(p) }}</span>
                </div>
              }
            </div>
            @if (c.created_by === me()) {
              <ion-button fill="clear" color="medium" (click)="remove()">{{ confirmDelete() ? t('card.deleteConfirm') : t('card.delete') }}</ion-button>
            }
          }
        </div>
      } @else if (loading()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else {
        <p role="alert" class="page-pad" style="color: #9C5428">{{ error() || t('card.gone') }}</p>
      }
    </ion-content>

    @if (card() && view() === 'hole') {
      <div class="nav">
        <ion-button fill="outline" color="medium" [disabled]="holeIndex() === 0" (click)="move(-1)">{{ t('card.previous') }}</ion-button>
        @if (holeIndex() < holes().length - 1) {
          <ion-button (click)="move(1)">{{ t('card.next') }}</ion-button>
        } @else {
          <ion-button (click)="view.set('card')">{{ t('card.seeFull') }}</ion-button>
        }
      </div>
    }
  `
})
export class ScorecardPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  /** Bound from the route parameter :id (withComponentInputBinding). */
  id = input.required<string>();

  private scorecards = inject(ScorecardsService);
  private sb = inject(SupabaseService);
  private router = inject(Router);

  card = signal<Scorecard | null>(null);
  loading = signal(true);
  error = signal('');
  view = signal<'hole' | 'card'>('hole');
  hole = signal(1);
  editingPar = signal(false);
  confirmDelete = signal(false);
  /** Known pars by course hole number. */
  private pars = signal(new Map<number, number>());
  /** Strokes by `${scorecardPlayerId}:${hole}`, including unsaved local entries. */
  private scores = signal(new Map<string, number>());
  /** Entries not yet saved to the server (null = clear the hole). Also kept in localStorage. */
  private pending = new Map<string, number | null>();
  unsaved = signal(0);
  private flushing = false;
  private timer?: ReturnType<typeof setInterval>;
  private onOnline = () => this.flush();

  me = computed(() => this.sb.session()?.user.id ?? null);
  holes = computed(() => (this.card() ? holeNumbers(this.card()!.holes) : []));
  holeIndex = computed(() => this.holes().indexOf(this.hole()));
  holesLabel = computed(() => (this.card() ? this.t(HOLES_LABEL[this.card()!.holes]) : ''));
  players = computed(() => [...(this.card()?.scorecard_players ?? [])].sort((a, b) => a.position - b.position));
  /** OpenStreetMap often maps a 9-hole course as holes 1-9; an 18-hole card then plays them twice. */
  private nineHoleCourse = computed(() => this.pars().size > 0 && Math.max(...this.pars().keys()) <= 9);

  private get storageKey() {
    return `fc.pendingScores.${this.id()}`;
  }

  async ionViewWillEnter() {
    this.restorePending();
    await this.load(true);
    this.timer = setInterval(() => this.flush().then(() => this.load(false)), POLL_MS);
    window.addEventListener('online', this.onOnline);
  }

  ionViewWillLeave() {
    clearInterval(this.timer);
    window.removeEventListener('online', this.onOnline);
  }

  private async load(first: boolean) {
    try {
      const card = await this.scorecards.get(this.id());
      if (first) this.pars.set(await this.scorecards.pars(card.course_id));
      const map = new Map<string, number>();
      for (const p of card.scorecard_players) for (const s of p.scores) map.set(`${p.id}:${s.hole}`, s.strokes);
      for (const [key, value] of this.pending) value === null ? map.delete(key) : map.set(key, value);
      this.card.set(card);
      this.scores.set(map);
      if (first) {
        const mine = card.scorecard_players.find((p) => p.profile_id === this.me());
        const next = this.holes().find((h) => !mine || !map.has(`${mine.id}:${h}`));
        this.hole.set(next ?? this.holes()[0]);
        this.flush();
      }
    } catch (e: any) {
      // Polling failures (no signal) are expected on the course; only report the first load.
      if (first) this.error.set(this.i18n.error(e, 'card.loadError'));
    } finally {
      this.loading.set(false);
    }
  }

  // --- pars -----------------------------------------------------------------

  /** The course hole that holds this card hole's par. */
  private parKey(h: number) {
    return this.nineHoleCourse() && h > 9 ? h - 9 : h;
  }
  parKnown(h: number) {
    return this.pars().has(this.parKey(h));
  }
  par(h: number) {
    return this.pars().get(this.parKey(h)) ?? DEFAULT_PAR;
  }
  parSum(from: number, to: number) {
    return this.holes().filter((h) => h >= from && h <= to).reduce((t, h) => t + this.par(h), 0);
  }

  async setPar(p: number) {
    const card = this.card()!;
    const key = this.parKey(this.hole());
    this.pars.update((m) => new Map(m).set(key, p));
    this.editingPar.set(false);
    try {
      await this.scorecards.setPar(card.course_id, key, p);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'card.parError'));
    }
  }

  // --- scores ---------------------------------------------------------------

  strokes(playerId: string, h: number) {
    return this.scores().get(`${playerId}:${h}`);
  }
  diff(playerId: string, h: number) {
    const s = this.strokes(playerId, h);
    return s === undefined ? 0 : s - this.par(h);
  }
  sum(playerId: string, from: number, to: number) {
    return this.holes().filter((h) => h >= from && h <= to).reduce((t, h) => t + (this.strokes(playerId, h) ?? 0), 0);
  }

  /** "+3 thru 7", "41 · E", or "No score yet". */
  summary(p: ScorecardPlayer) {
    const played = this.holes().filter((h) => this.strokes(p.id, h) !== undefined);
    if (!played.length) return this.t('card.noScore');
    const strokes = played.reduce((t, h) => t + this.strokes(p.id, h)!, 0);
    const toPar = formatToPar(played.reduce((t, h) => t + this.diff(p.id, h), 0));
    return played.length === this.holes().length ? `${strokes} · ${toPar}` : `${toPar} ${this.t('scores.thru', { n: played.length })}`;
  }

  tapNumber(p: ScorecardPlayer) {
    if (this.strokes(p.id, this.hole()) === undefined) this.set(p.id, this.hole(), this.par(this.hole()));
  }

  /** From an empty hole, − and + start at par. Going below 1 clears the hole. */
  step(p: ScorecardPlayer, delta: number) {
    const current = this.strokes(p.id, this.hole()) ?? this.par(this.hole());
    const next = current + delta;
    this.set(p.id, this.hole(), next < 1 ? null : Math.min(next, 20));
  }

  private set(playerId: string, h: number, strokes: number | null) {
    const key = `${playerId}:${h}`;
    this.scores.update((m) => {
      const copy = new Map(m);
      strokes === null ? copy.delete(key) : copy.set(key, strokes);
      return copy;
    });
    this.pending.set(key, strokes);
    this.savePending();
    this.flush();
  }

  /** Sends queued scores one by one; stops at the first failure and tries again later. */
  private async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      for (const [key, strokes] of [...this.pending]) {
        const [playerId, h] = key.split(':');
        await this.scorecards.setScore(playerId, Number(h), strokes);
        // Only drop it if it wasn't changed again while saving
        if (this.pending.get(key) === strokes) this.pending.delete(key);
        this.savePending();
      }
      this.error.set('');
    } catch (e: any) {
      // Offline: keep the queue. A real rejection (e.g. removed from the card) is worth showing.
      if (navigator.onLine && e?.message) this.error.set(e.message);
    } finally {
      this.flushing = false;
    }
  }

  private savePending() {
    this.unsaved.set(this.pending.size);
    if (this.pending.size) localStorage.setItem(this.storageKey, JSON.stringify([...this.pending]));
    else localStorage.removeItem(this.storageKey);
  }

  private restorePending() {
    try {
      this.pending = new Map(JSON.parse(localStorage.getItem(this.storageKey) ?? '[]'));
    } catch {
      this.pending = new Map();
    }
    this.unsaved.set(this.pending.size);
  }

  // --- navigation -----------------------------------------------------------

  move(delta: number) {
    const next = this.holes()[this.holeIndex() + delta];
    if (next !== undefined) {
      this.hole.set(next);
      this.editingPar.set(false);
    }
  }

  goTo(h: number) {
    this.hole.set(h);
    this.editingPar.set(false);
    this.view.set('hole');
  }

  /** Deleting loses everyone's scores, so it takes a second tap. */
  async remove() {
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      setTimeout(() => this.confirmDelete.set(false), 4000);
      return;
    }
    try {
      await this.scorecards.remove(this.id());
      localStorage.removeItem(this.storageKey);
      await this.router.navigateByUrl('/tabs/scores', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'card.deleteError'));
    }
  }
}
