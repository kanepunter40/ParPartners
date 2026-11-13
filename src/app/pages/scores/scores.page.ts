import { Component, inject, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { RouterLink } from '@angular/router';
import { IonContent, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { ScorecardsService, cardStats, formatToPar, HOLES_LABEL, isComplete } from '../../core/scorecards.service';
import { ScorecardSummary } from '../../core/models';
import { GolfStatsComponent } from '../../core/golf-stats.component';

@Component({
  selector: 'app-scores',
  imports: [RouterLink, IonContent, IonRefresher, IonRefresherContent, IonButton, GolfStatsComponent],
  styles: [`
    h1 { font-size: 38px; margin: 0 2px 18px; }
    .score { text-align: right; flex: none; display: flex; flex-direction: column; align-items: flex-end; }
    .score strong { font-family: var(--pp-serif); font-weight: 400; font-size: 26px; line-height: 1; letter-spacing: -0.02em; }
    .score small { color: var(--pp-ink3); font-size: 12px; margin-top: 4px; }
  `],
  template: `
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad top-safe">
        <h1>{{ t('scores.title') }}</h1>
        @if (error()) { <p role="alert" style="color: var(--pp-accent-ink)">{{ error() }}</p> }
        @if (stats().rounds18) {
          <app-golf-stats [stats]="stats()" style="margin-bottom: 16px" />
        }
        <!-- At the top, so it doesn't end up below a long list of cards -->
        @if (items().length) {
          <ion-button fill="outline" expand="block" routerLink="/scorecard/new" style="margin: 0 0 24px">{{ t('scores.start') }}</ion-button>
          <div class="pp-group">
            @for (s of items(); track s.id) {
              <a class="group-row" [routerLink]="['/scorecard', s.id]">
                <span class="txt">
                  <span>{{ s.course_name }}</span>
                  <small>{{ i18n.date(s.played_at, 'dayDateYear') }} · {{ t(label[s.holes]) }}</small>
                </span>
                <span class="score">
                  @if (s.holes_played) {
                    <strong>{{ s.strokes }}</strong>
                    <small>{{ toPar(s) }}{{ complete(s) ? '' : ' ' + t('scores.thru', { n: s.holes_played }) }}</small>
                  } @else {
                    <small>{{ t('scores.notStarted') }}</small>
                  }
                </span>
              </a>
            }
          </div>
        } @else if (loaded()) {
          <div style="padding: 24px 2px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start">
            <h2 style="margin: 0; font-size: 24px">{{ t('scores.emptyTitle') }}</h2>
            <p class="muted" style="margin: 0">{{ t('scores.emptyText') }}</p>
            <ion-button routerLink="/scorecard/new">{{ t('scores.start') }}</ion-button>
          </div>
        }
      </div>
    </ion-content>
  `
})
export class ScoresPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private scorecards = inject(ScorecardsService);
  readonly label = HOLES_LABEL;
  items = signal<ScorecardSummary[]>([]);
  loaded = signal(false);
  error = signal('');

  stats = computed(() => cardStats(this.items()));

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.error.set('');
    try {
      this.items.set(await this.scorecards.history());
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'scores.loadError'));
    } finally {
      this.loaded.set(true);
    }
  }

  async refresh(ev: Event) {
    await this.load();
    (ev as CustomEvent).detail.complete?.() ?? (ev.target as any).complete();
  }

  complete(s: ScorecardSummary) {
    return isComplete(s);
  }

  toPar(s: ScorecardSummary) {
    return formatToPar(s.strokes - s.par_played);
  }
}
