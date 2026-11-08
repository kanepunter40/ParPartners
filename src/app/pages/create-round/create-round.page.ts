import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonSearchbar, IonDatetime, IonTextarea, IonSpinner } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { Course } from '../../core/models';

@Component({
  selector: 'app-create-round',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonSearchbar, IonDatetime, IonTextarea, IonSpinner],
  styles: [`
    .opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; min-height: 56px; padding: 10px 16px; border-radius: 14px; border: 1px solid #E6DFC9; background: #fff; text-align: left; color: #1F3532; font-family: inherit; }
    .opt.on { background: #E3ECE9; border-color: #2E5F5A; }
    .opt small { color: #5F5B4E; }
    .stepper { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #D9D2BA; border-radius: 12px; padding: 6px 8px; }
    .stepper button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid #D9D2BA; background: #F4F1E8; font-size: 20px; color: #1F3532; }
    .sug { display: block; width: 100%; text-align: left; min-height: 48px; padding: 8px 14px; border: 0; border-bottom: 1px solid #EFEAD9; background: #fff; font-family: inherit; color: #1F3532; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/rounds" text=""></ion-back-button></ion-buttons>
        <ion-title>Post a round</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 18px">

        <div>
          <strong>Course</strong>
          <ion-searchbar placeholder="Search for a course" [value]="course()?.name ?? ''" [debounce]="250" (ionInput)="search($event)"></ion-searchbar>
          @if (suggestions().length) {
            <div style="border: 1px solid #E6DFC9; border-radius: 12px; overflow: hidden">
              @for (c of suggestions(); track c.id) {
                <button type="button" class="sug" (click)="pick(c)"><strong>{{ c.name }}</strong><br><span class="muted" style="font-size: 12px">{{ c.city }}</span></button>
              }
            </div>
          }
        </div>

        <div>
          <strong>Date and tee time</strong>
          <ion-datetime presentation="date-time" [min]="minDate" [(ngModel)]="teeTime" [minuteValues]="'0,10,20,30,40,50'" style="margin-top: 6px; border-radius: 12px"></ion-datetime>
        </div>

        <div>
          <strong>Players</strong>
          <div class="stepper" style="margin-top: 6px">
            <button type="button" aria-label="Fewer players" (click)="players.set(Math.max(2, players() - 1))">&minus;</button>
            <span style="font-weight: 600">{{ players() }} players</span>
            <button type="button" aria-label="More players" (click)="players.set(Math.min(8, players() + 1))">+</button>
          </div>
        </div>

        <div>
          <strong id="vis">Who can join</strong>
          <div role="group" aria-labelledby="vis" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px">
            <button type="button" class="opt" [class.on]="visibility() === 'nearby'" [attr.aria-pressed]="visibility() === 'nearby'" (click)="visibility.set('nearby')">
              <strong>Players nearby</strong><small>Shows in Find a round for anyone close to the course</small>
            </button>
            <button type="button" class="opt" [class.on]="visibility() === 'invite_only'" [attr.aria-pressed]="visibility() === 'invite_only'" (click)="visibility.set('invite_only')">
              <strong>Invite only</strong><small>Only people you share the link with</small>
            </button>
          </div>
        </div>

        <div>
          <strong>Notes</strong>
          <ion-textarea [(ngModel)]="notes" rows="3" maxlength="500" placeholder="Meeting point, trolley, anything to flag" style="margin-top: 6px; --background: #fff; border: 1px solid #D9D2BA; border-radius: 12px; --padding-start: 12px"></ion-textarea>
        </div>

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        <ion-button expand="block" [disabled]="!course() || busy()" (click)="post()">
          @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Post round }
        </ion-button>
      </div>
    </ion-content>
  `
})
export class CreateRoundPage {
  private rounds = inject(RoundsService);
  private router = inject(Router);
  readonly Math = Math;

  course = signal<Course | null>(null);
  suggestions = signal<Course[]>([]);
  players = signal(4);
  visibility = signal<'nearby' | 'invite_only'>('nearby');
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
        notes: this.notes.trim() || null
      });
      await this.router.navigate(['/round', id], { replaceUrl: true });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not post the round.');
    } finally {
      this.busy.set(false);
    }
  }
}
