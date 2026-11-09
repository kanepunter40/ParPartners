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
    .item { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; text-decoration: none; color: inherit; }
    .score { text-align: right; flex: none; }
    .score strong { display: block; font-family: 'Fraunces Variable', serif; font-size: 26px; line-height: 1.1; }
  `],
  template: `
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad top-safe">
        <h1 class="sr-only">{{ t('scores.title') }}</h1>
        @if (error()) { <p role="alert" style="color: #9C5428">{{ error() }}</p> }
        @if (stats().rounds18) {
          <app-golf-stats [stats]="stats()" style="margin-bottom: 16px" />
        }
        <!-- At the top, so it doesn't end up below a long list of cards -->
        @if (items().length) {
          <ion-button fill="outline" expand="block" routerLink="/scorecard/new" style="margin: 0 0 16px">{{ t('scores.start') }}</ion-button>
        }
        @for (s of items(); track s.id) {
          <a class="item" [routerLink]="['/scorecard', s.id]">
            <span style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
              <strong style="font-size: 17px">{{ s.course_name }}</strong>
              <span class="muted" style="font-size: 13px">{{ i18n.date(s.played_at, 'dayDateYear') }} · {{ t(label[s.holes]) }}</span>
            </span>
            <span class="score">
              @if (s.holes_played) {
                <strong>{{ s.strokes }}</strong>
                <span class="muted" style="font-size: 13px">{{ toPar(s) }}{{ complete(s) ? '' : ' ' + t('scores.thru', { n: s.holes_played }) }}</span>
              } @else {
                <span class="muted" style="font-size: 13px">{{ t('scores.notStarted') }}</span>
              }
            </span>
          </a>
        } @empty {
          @if (loaded()) {
            <div style="text-align: center; padding: 64px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
              <h2 style="margin: 0">{{ t('scores.emptyTitle') }}</h2>
              <p class="muted" style="margin: 0">{{ t('scores.emptyText') }}</p>
              <ion-button routerLink="/scorecard/new">{{ t('scores.start') }}</ion-button>
            </div>
          }
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
