import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { ScorecardsService, formatToPar, HOLES_LABEL, holeNumbers } from '../../core/scorecards.service';
import { ScorecardSummary } from '../../core/models';

@Component({
  selector: 'app-scores',
  imports: [DatePipe, RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonButton],
  styles: [`
    .item { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; text-decoration: none; color: inherit; }
    .score { text-align: right; flex: none; }
    .score strong { display: block; font-family: 'Fraunces', serif; font-size: 26px; line-height: 1.1; }
    .stats { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat { flex: 1; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 12px 14px; }
    .stat strong { display: block; font-family: 'Fraunces', serif; font-size: 22px; }
  `],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Scorecards</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad">
        @if (error()) { <p role="alert" style="color: #9C5428">{{ error() }}</p> }
        @if (completed18().length) {
          <div class="stats">
            <div class="stat"><span class="muted" style="font-size: 13px">18-hole rounds</span><strong>{{ completed18().length }}</strong></div>
            <div class="stat"><span class="muted" style="font-size: 13px">Average</span><strong>{{ average() }}</strong></div>
            <div class="stat"><span class="muted" style="font-size: 13px">Best</span><strong>{{ best() }}</strong></div>
          </div>
        }
        @for (s of items(); track s.id) {
          <a class="item" [routerLink]="['/scorecard', s.id]">
            <span style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
              <strong style="font-size: 17px">{{ s.course_name }}</strong>
              <span class="muted" style="font-size: 13px">{{ s.played_at | date: 'EEE d MMM y' }} · {{ label[s.holes] }}</span>
            </span>
            <span class="score">
              @if (s.holes_played) {
                <strong>{{ s.strokes }}</strong>
                <span class="muted" style="font-size: 13px">{{ toPar(s) }}{{ complete(s) ? '' : ' thru ' + s.holes_played }}</span>
              } @else {
                <span class="muted" style="font-size: 13px">Not started</span>
              }
            </span>
          </a>
        } @empty {
          @if (loaded()) {
            <div style="text-align: center; padding: 64px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
              <h2 style="margin: 0">No scorecards yet</h2>
              <p class="muted" style="margin: 0">Keep score from a round's page, or start a card for any round you play.</p>
              <ion-button routerLink="/scorecard/new">Start a scorecard</ion-button>
            </div>
          }
        }
      </div>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button routerLink="/scorecard/new" aria-label="Start a scorecard"><ion-icon name="add"></ion-icon></ion-fab-button>
      </ion-fab>
    </ion-content>
  `
})
export class ScoresPage {
  private scorecards = inject(ScorecardsService);
  readonly label = HOLES_LABEL;
  items = signal<ScorecardSummary[]>([]);
  loaded = signal(false);
  error = signal('');

  /** Finished 18-hole cards, for the stats row. */
  completed18 = computed(() => this.items().filter((s) => s.holes === '18' && this.complete(s)));
  average = computed(() => {
    const done = this.completed18();
    return done.length ? (done.reduce((t, s) => t + s.strokes, 0) / done.length).toFixed(1) : '';
  });
  best = computed(() => Math.min(...this.completed18().map((s) => s.strokes)));

  constructor() {
    addIcons({ add });
  }

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.error.set('');
    try {
      this.items.set(await this.scorecards.history());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load your scorecards.');
    } finally {
      this.loaded.set(true);
    }
  }

  async refresh(ev: Event) {
    await this.load();
    (ev as CustomEvent).detail.complete?.() ?? (ev.target as any).complete();
  }

  complete(s: ScorecardSummary) {
    return s.holes_played === holeNumbers(s.holes).length;
  }

  toPar(s: ScorecardSummary) {
    return formatToPar(s.strokes - s.par_played);
  }
}
