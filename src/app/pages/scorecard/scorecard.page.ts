import { Component, inject, input, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { ScorecardsService, holeNumbers, formatToPar, HOLES_LABEL } from '../../core/scorecards.service';
import { SupabaseService } from '../../core/supabase.service';
import { Scorecard, ScorecardPlayer } from '../../core/models';
import { ROUND_FORMATS, RoundFormat } from '../../core/round-format';
import { Side, cardFormat, isMatchFormat, match, stablefordTotal } from '../../core/scoring';

const DEFAULT_PAR = 4;
const POLL_MS = 20_000;

@Component({
  selector: 'app-scorecard',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonSelect, IonSelectOption],
  styles: [`
    .hole-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .hole-no { font-family: 'Newsreader Variable', serif; font-size: 44px; line-height: 1; margin: 0; }
    .par-btn { min-height: 44px; padding: 0 16px; border-radius: var(--pp-radius-control); border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); font: inherit; font-weight: 600; color: var(--pp-ink); }
    .par-btn.unknown { border-style: dashed; color: var(--pp-ink2); }
    .par-btn:disabled { opacity: 1; border-color: transparent; background: transparent; }
    .pars { display: flex; gap: 8px; }
    .pars button { flex: 1; min-height: 48px; border-radius: var(--pp-radius-control); border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); font: inherit; font-weight: 600; color: var(--pp-ink); }
    .pars button[aria-pressed="true"] { background: var(--pp-deep); border-color: var(--pp-deep); color: #fff; }
    .card { background: var(--pp-surface); border: 1px solid var(--pp-rule); border-radius: var(--pp-radius-group); overflow: hidden; }
    .prow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--pp-rule-soft); }
    .prow:last-child { border-bottom: 0; }
    .pname { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pname strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stepper { display: flex; align-items: center; gap: 6px; flex: none; }
    .stepper .round { width: 48px; height: 48px; border-radius: 999px; border: 1px solid var(--pp-rule-strong); background: var(--pp-bg); font-size: 22px; color: var(--pp-ink); }
    .stepper .num { width: 56px; height: 56px; border-radius: var(--pp-radius-control); border: 2px solid var(--pp-deep); background: var(--pp-surface); font: inherit; font-size: 24px; font-weight: 700; color: var(--pp-ink); }
    .stepper .num.empty { border: 2px dashed var(--pp-rule-strong); color: var(--pp-ink2); font-weight: 500; }
    .under { color: var(--pp-deep); }
    .over { color: var(--pp-accent-ink); }
    .nav { display: flex; gap: 10px; padding: 12px 24px 24px; background: var(--pp-bg); border-top: 1px solid var(--pp-rule); }
    .nav ion-button { flex: 1; }
    .grid-wrap { overflow-x: auto; border: 1px solid var(--pp-rule); border-radius: var(--pp-radius-group); background: var(--pp-surface); }
    table { border-collapse: collapse; font-size: 14px; min-width: 100%; }
    th, td { padding: 0; text-align: center; border-bottom: 1px solid var(--pp-rule-soft); min-width: 36px; height: 40px; }
    th:first-child, td:first-child { position: sticky; left: 0; background: var(--pp-surface); text-align: left; padding: 0 12px; min-width: 96px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-right: 1px solid var(--pp-rule-soft); }
    tr:last-child td { border-bottom: 0; }
    .sum { background: var(--pp-bg); font-weight: 700; }
    .hole-link { width: 100%; height: 40px; border: 0; background: none; font: inherit; font-weight: 600; color: var(--pp-deep); }
    .par-row td { color: var(--pp-ink2); }
    /* Scorecard marks, as golfers draw them on paper: circle birdie, double circle eagle or better,
       square bogey, double square double bogey or worse. The second ring is an outline, so it follows the shape. */
    .mark { display: inline-grid; place-items: center; width: 24px; height: 24px; line-height: 1; font-variant-numeric: tabular-nums; }
    .mark.birdie, .mark.eagle { border: 1.5px solid currentColor; border-radius: 50%; }
    .mark.bogey, .mark.double { border: 1.5px solid currentColor; border-radius: 2px; }
    .mark.eagle, .mark.double { outline: 1.5px solid currentColor; outline-offset: 1.5px; }
    /* One row on a phone: short labels, spread across the width */
    .legend { display: flex; justify-content: space-between; gap: 10px; margin: 0 4px; font-size: 12px; color: var(--pp-ink2); white-space: nowrap; }
    .legend > span { display: inline-flex; align-items: center; gap: 6px; }
    .legend .mark { width: 13px; height: 13px; }
    .legend .mark.eagle, .legend .mark.double { outline-offset: 1px; }
    .result { padding: 14px 16px; border-radius: var(--pp-radius-control); background: var(--pp-deep-soft); color: var(--pp-ink); display: flex; flex-direction: column; gap: 2px; }
    .format-select { min-height: 44px; padding: 0 16px; border-radius: var(--pp-radius-control); border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); color: var(--pp-ink); font-weight: 600; font-size: 14px; }
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
          @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }

          @if (view() === 'hole') {
            <div class="hole-head">
              <div>
                <div class="muted" style="font-size: 13px">{{ t('card.nOfM', { n: holeIndex() + 1, m: holes().length }) }}</div>
                <h2 class="hole-no" aria-live="polite">{{ t('card.hole', { n: hole() }) }}</h2>
              </div>
              <button type="button" class="par-btn" [class.unknown]="!parKnown(hole())" [disabled]="parLocked(hole())" [attr.aria-expanded]="parLocked(hole()) ? null : editingPar()" (click)="editingPar.set(!editingPar())">
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
            @if (matchLabel(); as m) { <div class="result" role="status"><strong>{{ m }}</strong><span class="muted" style="font-size: 13px">{{ sidesLabel() }}</span></div> }
            @if (format() === 'scramble') { <p class="muted" style="margin: 0; font-size: 13px">{{ t('card.scrambleHint') }}</p> }
            <p class="muted" style="margin: 0; font-size: 13px">{{ t('card.hint') }}</p>
          } @else {
            <div class="muted" style="font-size: 13px">{{ i18n.date(c.played_at, 'dayDateYear') }} · {{ holesLabel() }}</div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
              <span id="scoring-label" style="font-weight: 600">{{ t('card.scoring') }}</span>
              <ion-select class="format-select" interface="action-sheet" aria-labelledby="scoring-label" [value]="format()" [cancelText]="t('common.cancel')" (ionChange)="setFormat($event)">
                @for (f of formats; track f) { <ion-select-option [value]="f">{{ t('format.' + f) }}</ion-select-option> }
              </ion-select>
            </div>
            @if (format() === 'stableford') { <p class="muted" style="margin: 0; font-size: 13px">{{ t('card.stablefordNote') }}</p> }
            @if (format() === 'scramble') { <p class="muted" style="margin: 0; font-size: 13px">{{ t('card.scrambleHint') }}</p> }
            @if (isMatchFormat(format()) && !sides()) { <p class="muted" style="margin: 0; font-size: 13px">{{ t(format() === 'best_ball' ? 'card.bestBallNeeds' : 'card.matchNeeds') }}</p> }
            @if (matchLabel(); as m) { <div class="result" role="status"><strong>{{ m }}</strong><span class="muted" style="font-size: 13px">{{ sidesLabel() }}</span></div> }
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
                        <td [class.under]="diff(p.id, h) < 0" [class.over]="diff(p.id, h) > 0">
                          @if (strokes(p.id, h) !== undefined) {
                            <span class="mark" [class]="'mark ' + mark(p.id, h)" [attr.aria-label]="mark(p.id, h) ? strokes(p.id, h) + ', ' + t('card.mark.' + mark(p.id, h)) : null">{{ strokes(p.id, h) }}</span>
                          }
                        </td>
                        @if (h === 9 && c.holes === '18') { <td class="sum">{{ sum(p.id, 1, 9) || '' }}</td> }
                      }
                      @if (c.holes === '18') { <td class="sum">{{ sum(p.id, 10, 18) || '' }}</td> }
                      <td class="sum">{{ sum(p.id, holes()[0], holes()[holes().length - 1]) || '' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="legend" aria-hidden="true">
              <span><span class="mark eagle"></span>{{ t('card.markShort.eagle') }}</span>
              <span><span class="mark birdie"></span>{{ t('card.markShort.birdie') }}</span>
              <span><span class="mark bogey"></span>{{ t('card.markShort.bogey') }}</span>
              <span><span class="mark double"></span>{{ t('card.markShort.double') }}</span>
            </p>
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
        <p role="alert" class="page-pad" style="color: var(--pp-accent-ink)">{{ error() || t('card.gone') }}</p>
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
  /** Course holes whose par comes from the course data and can't be changed. */
  private lockedPars = signal(new Set<number>());
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
      if (first) {
        const known = await this.scorecards.pars(card.course_id);
        this.pars.set(known.pars);
        this.lockedPars.set(known.locked);
      }
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
  parLocked(h: number) {
    return this.lockedPars().has(this.parKey(h));
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
  /** Paper-scorecard mark for a hole. Only against a known par, so a guessed par never draws a circle or square. */
  mark(playerId: string, h: number): '' | 'eagle' | 'birdie' | 'bogey' | 'double' {
    if (this.strokes(playerId, h) === undefined || !this.parKnown(h)) return '';
    const d = this.diff(playerId, h);
    return d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 1 ? 'bogey' : d >= 2 ? 'double' : '';
  }
  sum(playerId: string, from: number, to: number) {
    return this.holes().filter((h) => h >= from && h <= to).reduce((t, h) => t + (this.strokes(playerId, h) ?? 0), 0);
  }

  /** "+3 thru 7", "41 · E", or "No score yet". Stableford adds the points. */
  summary(p: ScorecardPlayer) {
    const played = this.holes().filter((h) => this.strokes(p.id, h) !== undefined);
    if (!played.length) return this.t('card.noScore');
    const strokes = played.reduce((t, h) => t + this.strokes(p.id, h)!, 0);
    const toPar = formatToPar(played.reduce((t, h) => t + this.diff(p.id, h), 0));
    const base = played.length === this.holes().length ? `${strokes} · ${toPar}` : `${toPar} ${this.t('scores.thru', { n: played.length })}`;
    if (this.format() !== 'stableford') return base;
    const points = stablefordTotal(p.id, this.holes(), (id, h) => this.strokes(id, h), (h) => this.par(h));
    return `${this.t('card.points', { count: points })} · ${base}`;
  }

  // --- formats ----------------------------------------------------------------

  readonly formats = ROUND_FORMATS.filter((f) => f !== 'casual');
  readonly isMatchFormat = isMatchFormat;
  format = computed(() => cardFormat(this.card()?.format ?? null, this.card()?.rounds?.format));

  /** Match play: the first two players. Best ball: players 1 and 2 against 3 and 4. */
  sides = computed<[Side, Side] | null>(() => {
    const ps = this.players();
    const side = (list: ScorecardPlayer[]): Side => ({ name: list.map((p) => p.name).join(' & '), ids: list.map((p) => p.id) });
    if (this.format() === 'match_play' && ps.length >= 2) return [side(ps.slice(0, 1)), side(ps.slice(1, 2))];
    if (this.format() === 'best_ball' && ps.length >= 3) return [side(ps.slice(0, 2)), side(ps.slice(2, 4))];
    return null;
  });

  sidesLabel = computed(() => {
    const s = this.sides();
    return s ? `${s[0].name} ${this.t('card.vs')} ${s[1].name}` : '';
  });

  /** "Lena 2 up thru 7", "All square thru 4", "Lena wins 3&2", "Halved". */
  matchLabel = computed(() => {
    const s = this.sides();
    if (!s) return '';
    const m = match(s[0], s[1], this.holes(), (id, h) => this.strokes(id, h));
    if (!m.played) return this.t('card.matchNotStarted');
    const leader = m.lead > 0 ? s[0].name : s[1].name;
    const up = Math.abs(m.lead);
    if (m.decided) {
      if (!up) return this.t('card.halved');
      return m.remaining ? this.t('card.winsAnd', { name: leader, up, left: m.remaining }) : this.t('card.winsUp', { name: leader, up });
    }
    return up ? this.t('card.up', { name: leader, up, n: m.played }) : this.t('card.allSquare', { n: m.played });
  });

  async setFormat(ev: Event) {
    const card = this.card();
    const f = (ev as CustomEvent).detail.value as RoundFormat;
    if (!card || f === this.format()) return;
    const before = card.format;
    this.card.set({ ...card, format: f });
    try {
      await this.scorecards.setFormat(card.id, f);
    } catch (e: any) {
      this.card.update((c) => (c ? { ...c, format: before } : c));
      this.error.set(this.i18n.error(e, 'common.error'));
    }
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
