import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonSearchbar, IonDatetime, IonTextarea, IonSpinner } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { CartPref, Course } from '../../core/models';
import { ROUND_FORMATS, RoundFormat } from '../../core/round-format';

@Component({
  selector: 'app-create-round',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonSearchbar, IonDatetime, IonTextarea, IonSpinner],
  styles: [`
    .opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; min-height: 56px; padding: 10px 16px; border-radius: 14px; border: 1px solid #E6DFC9; background: #fff; text-align: left; color: #1F3532; font-family: inherit; }
    .opt.on { background: #E3ECE9; border-color: #2E5F5A; }
    .opt small { color: #5F5B4E; }
    .stepper { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #D9D2BA; border-radius: 12px; padding: 6px 8px; }
    .stepper button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid #D9D2BA; background: #F4F1E8; font-size: 20px; color: #1F3532; }
    .formats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
    .fmt { min-height: 44px; padding: 0 6px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font: 600 13px 'Work Sans', sans-serif; }
    .fmt.on { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .sug { display: block; width: 100%; text-align: left; min-height: 48px; padding: 8px 14px; border: 0; border-bottom: 1px solid #EFEAD9; background: #fff; font-family: inherit; color: #1F3532; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/rounds" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('rounds.post') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 18px">

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

        <div>
          <strong>{{ t('create.dateTime') }}</strong>
          <ion-datetime presentation="date-time" [locale]="i18n.locale()" [firstDayOfWeek]="1" [min]="minDate" [(ngModel)]="teeTime" [minuteValues]="'0,10,20,30,40,50'" style="margin-top: 6px; border-radius: 12px"><span slot="time-label">{{ t('create.time') }}</span></ion-datetime>
        </div>

        <div>
          <strong>{{ t('round.players') }}</strong>
          <div class="stepper" style="margin-top: 6px">
            <button type="button" [attr.aria-label]="t('create.fewer')" (click)="players.set(Math.max(2, players() - 1))">&minus;</button>
            <span style="font-weight: 600">{{ t('create.playerCount', { count: players() }) }}</span>
            <button type="button" [attr.aria-label]="t('create.more')" (click)="players.set(Math.min(8, players() + 1))">+</button>
          </div>
        </div>

        <div>
          <strong id="fmt">{{ t('format.label') }}</strong>
          <div class="formats" role="radiogroup" aria-labelledby="fmt">
            @for (f of formats; track f) {
              <button type="button" class="fmt" role="radio" [class.on]="format() === f" [attr.aria-checked]="format() === f" (click)="format.set(f)">{{ t('format.' + f) }}</button>
            }
          </div>
          <small class="muted" style="display: block; margin-top: 8px" aria-live="polite">{{ t('format.hint.' + format()) }}</small>
        </div>

        <div>
          <strong id="cart">{{ t('cart.label') }}</strong>
          <div class="formats" role="radiogroup" aria-labelledby="cart">
            @for (c of carts; track c) {
              <button type="button" class="fmt" role="radio" [class.on]="cart() === c" [attr.aria-checked]="cart() === c" (click)="cart.set(c)">{{ t('cart.' + (c ?? 'any')) }}</button>
            }
          </div>
        </div>

        <div>
          <strong id="vis">{{ t('create.whoJoin') }}</strong>
          <div role="group" aria-labelledby="vis" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px">
            <button type="button" class="opt" [class.on]="visibility() === 'nearby'" [attr.aria-pressed]="visibility() === 'nearby'" (click)="visibility.set('nearby')">
              <strong>{{ t('create.nearby') }}</strong><small>{{ t('create.nearbyHint') }}</small>
            </button>
            <button type="button" class="opt" [class.on]="visibility() === 'invite_only'" [attr.aria-pressed]="visibility() === 'invite_only'" (click)="visibility.set('invite_only')">
              <strong>{{ t('create.inviteOnly') }}</strong><small>{{ t('create.inviteHint') }}</small>
            </button>
          </div>
        </div>

        <div>
          <strong>{{ t('round.notes') }}</strong>
          <ion-textarea [(ngModel)]="notes" rows="3" maxlength="500" [placeholder]="t('create.notesPlaceholder')" style="margin-top: 6px; --background: #fff; border: 1px solid #D9D2BA; border-radius: 12px; overflow: hidden; --padding-start: 12px"></ion-textarea>
        </div>

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        <ion-button expand="block" [disabled]="!course() || busy()" (click)="post()">
          @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('create.submit') }} }
        </ion-button>
      </div>
    </ion-content>
  `
})
export class CreateRoundPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private rounds = inject(RoundsService);
  private router = inject(Router);
  readonly Math = Math;

  course = signal<Course | null>(null);
  suggestions = signal<Course[]>([]);
  players = signal(4);
  visibility = signal<'nearby' | 'invite_only'>('nearby');
  readonly formats = ROUND_FORMATS;
  format = signal<RoundFormat>('casual');
  readonly carts: (CartPref | null)[] = [null, 'walk', 'cart'];
  cart = signal<CartPref | null>(null);
  notes = '';
  busy = signal(false);
  error = signal('');
  minDate = new Date().toISOString();
  teeTime = this.defaultTeeTime();

  /** Next Saturday at 10:00 local time, as an ISO string for ion-datetime. */
  private defaultTeeTime(): string {
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
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

  async post() {
    if (!this.course()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const id = await this.rounds.createRound({
        course_id: this.course()!.id,
        tee_time: new Date(this.teeTime).toISOString(),
        max_players: this.players(),
        visibility: this.visibility(),
        notes: this.notes.trim() || null,
        format: this.format(),
        cart: this.cart()
      });
      await this.router.navigate(['/round', id], { replaceUrl: true });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'create.error'));
    } finally {
      this.busy.set(false);
    }
  }
}
