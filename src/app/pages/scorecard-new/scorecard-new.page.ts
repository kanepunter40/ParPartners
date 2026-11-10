import { Component, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSearchbar, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { ScorecardsService, HOLES_LABEL } from '../../core/scorecards.service';
import { RoundsService } from '../../core/rounds.service';
import { ProfileService } from '../../core/profile.service';
import { CardHoles, Course } from '../../core/models';

const MAX_GUESTS = 7;

@Component({
  selector: 'app-scorecard-new',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSearchbar, IonInput, IonSpinner],
  styles: [`
    .opts { display: flex; gap: 8px; margin-top: 8px; }
    .opts button { flex: 1; min-height: 48px; border-radius: 12px; border: 1px solid #D9D2BA; background: #fff; font: inherit; font-weight: 600; color: #1F3532; }
    .opts button[aria-pressed="true"] { background: #E3ECE9; border-color: #2E5F5A; color: #2E5F5A; }
    .sug { display: block; width: 100%; text-align: left; min-height: 48px; padding: 8px 14px; border: 0; border-bottom: 1px solid #EFEAD9; background: #fff; font-family: inherit; color: #1F3532; }
    .guest { display: flex; gap: 8px; align-items: center; }
    .guest ion-input { --background: #fff; border: 1px solid #D9D2BA; border-radius: 12px; overflow: hidden; --padding-start: 12px; min-height: 48px; }
    .me { display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 14px; border: 1px solid #E6DFC9; border-radius: 12px; background: #fff; font-weight: 600; }
    .remove { min-width: 44px; min-height: 44px; border: 0; background: none; font-size: 22px; color: #5F5B4E; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="round() ? '/round/' + round() : '/tabs/scores'" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('cardNew.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (checking()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad" style="display: flex; flex-direction: column; gap: 20px">
          @if (round()) {
            <div>
              <div class="muted" style="font-size: 13px">{{ t('cardNew.forRound') }}</div>
              <h2 style="margin: 4px 0 0">{{ course()?.name }}</h2>
              <p class="muted" style="margin: 6px 0 0; font-size: 13px">{{ t('cardNew.everyone') }}</p>
            </div>
          } @else {
            <div>
              <strong>{{ t('find.course') }}</strong>
              <ion-searchbar [placeholder]="t('find.searchCourse')" [value]="course()?.name ?? ''" [debounce]="250" (ionInput)="search($event)"></ion-searchbar>
              @if (suggestions().length) {
                <div style="border: 1px solid #E6DFC9; border-radius: 12px; overflow: hidden">
                  @for (c of suggestions(); track c.id) {
                    <button type="button" class="sug" (click)="pick(c)"><strong>{{ c.name }}</strong><br><span class="muted" style="font-size: 12px">{{ c.city }}</span></button>
                  }
                </div>
              }
            </div>
          }

          <div>
            <strong id="holes-label">{{ t('cardNew.holes') }}</strong>
            <div class="opts" role="group" aria-labelledby="holes-label">
              @for (h of holeOptions; track h) {
                <button type="button" [attr.aria-pressed]="holes() === h" (click)="holes.set(h)">{{ t(label[h]) }}</button>
              }
            </div>
          </div>

          @if (!round()) {
            <div style="display: flex; flex-direction: column; gap: 8px">
              <strong>{{ t('round.players') }}</strong>
              <div class="me">{{ myName() }} <span class="muted">{{ t('cardNew.you') }}</span></div>
              @for (g of guests(); track $index) {
                <div class="guest">
                  <ion-input [value]="g" (ionInput)="setGuest($index, $any($event).detail.value)" [placeholder]="t('cardNew.playerName')" maxlength="60" [attr.aria-label]="t('cardNew.playerN', { n: $index + 2 })"></ion-input>
                  <button type="button" class="remove" [attr.aria-label]="t('cardNew.removeN', { n: $index + 2 })" (click)="removeGuest($index)">&times;</button>
                </div>
                @if (isMe(g)) {
                  <p class="muted" style="margin: -4px 0 0; font-size: 13px">{{ t('cardNew.alreadyYou') }}</p>
                }
              }
              @if (guests().length < maxGuests) {
                <ion-button fill="outline" color="medium" (click)="addGuest()">{{ t('cardNew.addPlayer') }}</ion-button>
              }
              <div class="muted" style="font-size: 13px">{{ t('cardNew.guestsHint') }}</div>
            </div>
          }

          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

          <ion-button expand="block" [disabled]="!course() || busy()" (click)="start()">
            @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('scores.start') }} }
          </ion-button>
          @if (!course()) {
            <p class="muted" style="margin: -8px 0 0; font-size: 13px; text-align: center">{{ t('cardNew.pickCourse') }}</p>
          }
        </div>
      }
    </ion-content>
  `
})
export class ScorecardNewPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  /** ?round=<id> (withComponentInputBinding): start or open the card for that round. */
  round = input<string>();

  private scorecards = inject(ScorecardsService);
  private rounds = inject(RoundsService);
  private profiles = inject(ProfileService);
  private router = inject(Router);

  readonly holeOptions: CardHoles[] = ['18', 'front9', 'back9'];
  readonly label = HOLES_LABEL;
  readonly maxGuests = MAX_GUESTS;

  checking = signal(true);
  course = signal<Course | null>(null);
  suggestions = signal<Course[]>([]);
  holes = signal<CardHoles>('18');
  guests = signal<string[]>([]);
  busy = signal(false);
  error = signal('');
  /** The signed-in player, always first on a solo card. */
  myName = signal('');

  async ionViewWillEnter() {
    this.error.set('');
    const roundId = this.round();
    if (!roundId) {
      this.myName.set((await this.profiles.load())?.display_name ?? this.t('cardNew.youName'));
      this.checking.set(false);
      return;
    }
    try {
      // The round may already have a card (someone else started it): go straight there.
      const existing = await this.scorecards.startForRound(roundId, null);
      if (existing) {
        await this.router.navigate(['/scorecard', existing], { replaceUrl: true });
        return;
      }
      const r = await this.rounds.getRound(roundId);
      this.course.set({ id: '', name: r.courses.name, city: r.courses.city, lat: 0, lng: 0 });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'cardNew.openError'));
    } finally {
      this.checking.set(false);
    }
  }

  async search(ev: Event) {
    const q = (ev as CustomEvent).detail?.value ?? '';
    if (q.length < 2 || q === this.course()?.name) { this.suggestions.set([]); return; }
    this.suggestions.set(await this.rounds.searchCourses(q));
  }

  pick(c: Course) {
    this.course.set(c);
    this.suggestions.set([]);
  }

  addGuest() { this.guests.update((g) => [...g, '']); }
  removeGuest(i: number) { this.guests.update((g) => g.filter((_, j) => j !== i)); }
  setGuest(i: number, value: string) { this.guests.update((g) => g.map((v, j) => (j === i ? value ?? '' : v))); }

  /** Matches your full name or first name, e.g. "Kane" for "Kane Punter". */
  isMe(name: string) {
    const n = name.trim().toLowerCase();
    const mine = this.myName().trim().toLowerCase();
    return !!n && (n === mine || n === mine.split(/\s+/)[0]);
  }

  async start() {
    this.busy.set(true);
    this.error.set('');
    try {
      const roundId = this.round();
      const id = roundId
        ? await this.scorecards.startForRound(roundId, this.holes())
        : await this.scorecards.startSolo(this.course()!.id, this.holes(), this.guests().map((g) => g.trim()).filter(Boolean));
      await this.router.navigate(['/scorecard', id], { replaceUrl: true });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'cardNew.startError'));
    } finally {
      this.busy.set(false);
    }
  }
}
