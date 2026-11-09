import { Component, computed, inject, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, sparkles } from 'ionicons/icons';
import { I18nService } from './i18n.service';
import { CardStats } from './scorecards.service';

/** Changes smaller than this (in strokes) count as "steady". */
const FLAT = 0.5;
const W = 100;
const H = 28;

/** The 18-hole rounds / average / best tiles, with a score graph under the average and a trophy on the best. */
@Component({
  selector: 'app-golf-stats',
  imports: [IonIcon],
  styles: [`
    :host { display: flex; gap: 12px; }
    .stat { flex: 1; min-width: 0; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; }
    .lbl { font-size: 13px; color: #5F5B4E; display: flex; align-items: center; gap: 4px; }
    strong { display: block; font-family: 'Fraunces Variable', serif; font-size: 22px; }
    .row { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
    .trend { font-size: 12px; font-weight: 600; white-space: nowrap; }
    .good { color: #2E7D5B; }
    .bad { color: #B0552A; }
    .flat { color: #5F5B4E; }
    svg { display: block; width: 100%; height: 28px; margin-top: 6px; overflow: visible; }
    .trophy { color: #B8892B; font-size: 15px; }
    .best { background: linear-gradient(160deg, #FFF8E6, #fff 60%); }
    .best.new { border-color: #E3C77A; }
    .badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 3px; margin-top: 6px; padding: 2px 8px; border-radius: 999px;
      background: #F6E7BC; color: #6E5214; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .badge ion-icon { font-size: 12px; }
    @media (prefers-reduced-motion: no-preference) {
      .new .trophy { animation: pop .7s cubic-bezier(.3, 1.6, .5, 1) both; }
      @keyframes pop { 0% { transform: scale(.4) rotate(-20deg); } 100% { transform: none; } }
    }
  `],
  template: `
    <div class="stat"><span class="lbl">{{ t('scores.rounds18') }}</span><strong>{{ stats().rounds18 }}</strong></div>

    <div class="stat">
      <span class="lbl">{{ t('scores.average') }}</span>
      <span class="row">
        <strong>{{ stats().average }}</strong>
        @if (trend(); as tr) {
          <span class="trend" [class]="tr.cls" [attr.aria-label]="tr.label" role="img">{{ tr.arrow }}{{ tr.text }}</span>
        }
      </span>
      @if (line(); as l) {
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" aria-hidden="true">
          <polyline [attr.points]="l.points" fill="none" [attr.stroke]="l.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          <circle [attr.cx]="l.last[0]" [attr.cy]="l.last[1]" r="2.5" [attr.fill]="l.color" vector-effect="non-scaling-stroke" />
        </svg>
      }
    </div>

    <div class="stat best" [class.new]="stats().newBest">
      <span class="lbl"><ion-icon class="trophy" name="trophy" aria-hidden="true"></ion-icon>{{ t('scores.best') }}</span>
      <strong>{{ stats().best }}</strong>
      @if (stats().newBest) {
        <span class="badge"><ion-icon name="sparkles" aria-hidden="true"></ion-icon>{{ t('scores.newBest') }}</span>
      }
    </div>
  `
})
export class GolfStatsComponent {
  private i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly W = W;
  readonly H = H;
  stats = input.required<CardStats>();

  trend = computed(() => {
    const d = this.stats().trend;
    if (d === null) return null;
    const n = Math.abs(d).toFixed(1);
    const loc = this.i18n.lang() === 'de' ? n.replace('.', ',') : n;
    if (d <= -FLAT) return { cls: 'trend good', arrow: '↓ ', text: loc, label: this.t('scores.trendDown', { n: loc }) };
    if (d >= FLAT) return { cls: 'trend bad', arrow: '↑ ', text: loc, label: this.t('scores.trendUp', { n: loc }) };
    return { cls: 'trend flat', arrow: '→', text: '', label: this.t('scores.trendFlat') };
  });

  /** Recent scores as a line: higher score = higher on the graph, coloured by the trend. */
  line = computed(() => {
    const xs = this.stats().recent;
    if (xs.length < 2) return null;
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const span = hi - lo || 1;
    const pad = 3;
    const pts = xs.map((s, i) => [
      +(i * W / (xs.length - 1)).toFixed(1),
      +(hi === lo ? H / 2 : pad + (s - lo) / span * (H - 2 * pad)).toFixed(1)
    ]);
    // SVG y grows downwards, so flip: low scores sit low
    const flipped = pts.map(([x, y]) => [x, H - y]);
    const d = this.stats().trend ?? 0;
    const color = d <= -FLAT ? '#2E7D5B' : d >= FLAT ? '#B0552A' : '#5F5B4E';
    return { points: flipped.map((p) => p.join(',')).join(' '), last: flipped.at(-1)!, color };
  });

  constructor() {
    addIcons({ trophy, sparkles });
  }
}
