import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from './i18n.service';
import { CardStats } from './scorecards.service';

/** Changes smaller than this (in strokes) count as "steady". */
const FLAT = 0.5;
const W = 100;
const H = 28;

/** Average (with a score graph), best and 18-hole round count, as one grouped block. */
@Component({
  selector: 'app-golf-stats',
  imports: [],
  styles: [`
    /* One block, not three tiles: the average leads, best and round count are list rows (blend H) */
    :host { display: block; }
    .lead { padding: 14px 14px 12px; border-bottom: 1px solid var(--pp-rule-soft); }
    .lbl { font-size: 14px; color: var(--pp-ink2); }
    .avg { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-top: 2px; }
    .avg strong { font-family: var(--pp-serif); font-weight: 300; font-size: 44px; line-height: 1; letter-spacing: -0.03em; }
    .trend { font-size: 13px; font-weight: 600; }
    .good { color: #2E7D5B; }
    .bad { color: var(--pp-accent-ink); }
    .flat { color: var(--pp-ink2); }
    .graph { position: relative; display: block; height: 32px; margin-top: 10px; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; transform: translate(-50%, -50%); }
    .num { font-family: var(--pp-serif); font-size: 22px; line-height: 1; color: var(--pp-ink); }
    .txt .new { color: var(--pp-accent-ink); font-weight: 600; font-size: 13px; }
  `],
  template: `
    <div class="pp-group">
      <div class="lead">
        <span class="lbl">{{ t('scores.average') }}</span>
        <span class="avg">
          <strong>{{ num(stats().average) }}</strong>
          @if (trend(); as tr) {
            <span class="trend" [class]="tr.cls" [attr.aria-label]="tr.label" role="img">{{ tr.arrow }}{{ tr.text }}</span>
          }
        </span>
        @if (line(); as l) {
          <!-- The line stretches to the width; the end dot is HTML so it stays round -->
          <span class="graph">
            <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" aria-hidden="true">
              <polyline [attr.points]="l.points" fill="none" [attr.stroke]="l.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            </svg>
            <span class="dot" [style.left.%]="l.last[0] / W * 100" [style.top.%]="l.last[1] / H * 100" [style.background]="l.color"></span>
          </span>
        }
      </div>
      <div class="group-row">
        <span class="txt"><span>{{ t('scores.best') }}</span>@if (stats().newBest) { <small class="new">{{ t('scores.newBest') }}</small> }</span>
        <span class="num">{{ num(stats().best) }}</span>
      </div>
      <div class="group-row">
        <span class="txt">{{ t('scores.rounds18') }}</span>
        <span class="num">{{ i18n.num(stats().rounds18) }}</span>
      </div>
    </div>
  `
})
export class GolfStatsComponent {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly W = W;
  readonly H = H;
  stats = input.required<CardStats>();

  trend = computed(() => {
    const d = this.stats().trend;
    if (d === null) return null;
    const loc = this.i18n.num(Math.abs(d), 1);
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
    const color = d <= -FLAT ? '#2E7D5B' : d >= FLAT ? '#9A4F2A' : '#4F5B57';
    return { points: flipped.map((p) => p.join(',')).join(' '), last: flipped.at(-1)!, color };
  });

  /** Average ("93.1", always one decimal) and best can be missing before there are 18-hole cards. */
  num(n: number | string | null | undefined) {
    if (n == null) return '–';
    const decimals = typeof n === 'string' ? (n.split('.')[1]?.length ?? 0) : 0;
    return new Intl.NumberFormat(this.i18n.locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }).format(Number(n));
  }
}
