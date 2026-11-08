import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonProgressBar, IonSpinner } from '@ionic/angular/standalone';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { RoundsService } from '../../core/rounds.service';
import { Course } from '../../core/models';
import { GENDERS, LANGUAGES, LENGTHS, RoundLength, VIBES, Vibe, WHEN, parseHandicap, toggleWhen } from '../../core/profile-options';


@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, IonContent, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonProgressBar, IonSpinner],
  styles: [`
    .wrap { padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 20px; min-height: 100%; }
    .eyebrow { font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em; }
    h2 { font-size: 28px; margin: 4px 0 8px; line-height: 1.2; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font: 600 14px 'Work Sans', sans-serif; }
    .chip.on { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; min-height: 56px; padding: 10px 16px; border-radius: 14px; border: 1px solid #E6DFC9; background: #fff; text-align: left; color: #1F3532; font-family: inherit; }
    .row.on { background: #E3ECE9; border-color: #2E5F5A; }
    .row small { color: #5F5B4E; }
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; min-height: 48px; }
    .footer { margin-top: auto; display: flex; flex-direction: column; gap: 4px; }
    .nav { display: flex; align-items: center; gap: 12px; padding: 12px 16px 0; }
    .nav button { width: 44px; height: 44px; border: 0; background: none; font-size: 22px; }
  `],
  template: `
    <ion-content>
      <div class="nav">
        <button type="button" aria-label="Back" [style.visibility]="step() === 0 ? 'hidden' : 'visible'" (click)="back()">&#8592;</button>
        <ion-progress-bar [value]="(step() + 1) / total"></ion-progress-bar>
        <span class="muted" style="font-size: 13px">{{ step() + 1 }}/{{ total }}</span>
      </div>

      <div class="wrap">
        @switch (step()) {
          @case (0) {
            <div><div class="eyebrow">Create your profile</div><h2>What should other players call you?</h2></div>
            <ion-input aria-label="Name" placeholder="e.g. Kane Punter" autocomplete="name" [(ngModel)]="name"></ion-input>
          }
          @case (1) {
            <div><div class="eyebrow">Create your profile</div><h2>Where do you usually play?</h2>
              <p class="muted" style="margin: 0">Your home course helps us show open rounds near you.</p></div>
            <ion-searchbar placeholder="Search for a course" [debounce]="250" (ionInput)="searchCourses($event)"></ion-searchbar>
            <div style="display: flex; flex-direction: column; gap: 10px">
              @for (c of courses(); track c.id) {
                <button type="button" class="row" [class.on]="homeCourse()?.id === c.id" [attr.aria-pressed]="homeCourse()?.id === c.id" (click)="homeCourse.set(c)">
                  <strong>{{ c.name }}</strong><small>{{ c.city }}</small>
                </button>
              }
            </div>
          }
          @case (2) {
            <div><div class="eyebrow">Create your profile</div><h2>What's your handicap?</h2>
              <p class="muted" style="margin: 0">Use your Handicap Index from your club or the DGV. It lets others know what to expect.</p></div>
            <ion-input aria-label="Handicap Index" inputmode="decimal" placeholder="e.g. 18.4" [disabled]="noHandicap" [(ngModel)]="handicapText"></ion-input>
            <ion-checkbox [(ngModel)]="noHandicap" labelPlacement="end">I don't have a handicap yet</ion-checkbox>
          }
          @case (3) {
            <div><div class="eyebrow">Create your profile</div><h2>Which languages do you speak?</h2>
              <p class="muted" style="margin: 0">Handy when you play with people from different places.</p></div>
            <div class="chips">
              @for (l of languagesList; track l) {
                <button type="button" class="chip" [class.on]="languages().includes(l)" [attr.aria-pressed]="languages().includes(l)" (click)="toggle(languages, l)">{{ l }}</button>
              }
            </div>
          }
          @case (4) {
            <div><div class="eyebrow">Create your profile</div><h2>A little about you</h2>
              <p class="muted" style="margin: 0">Both optional. Other players only see them if you switch it on below.</p></div>
            <div><strong>Year of birth</strong>
              <ion-input aria-label="Year of birth" inputmode="numeric" maxlength="4" placeholder="e.g. 1992" [(ngModel)]="birthYearText" style="margin-top: 6px"></ion-input></div>
            <div><strong id="g">Gender</strong>
              <div class="chips" role="group" aria-labelledby="g" style="margin-top: 10px">
                @for (g of gendersList; track g) {
                  <button type="button" class="chip" [class.on]="gender() === g" [attr.aria-pressed]="gender() === g" (click)="gender.set(gender() === g ? null : g)">{{ g }}</button>
                }
              </div></div>
            <ion-toggle [(ngModel)]="showAgeGender">Show on my profile</ion-toggle>
          }
          @case (5) {
            <div><div class="eyebrow">Create your profile</div><h2>How do you like to play?</h2>
              <p class="muted" style="margin: 0">Optional. It helps us match you with the right players.</p></div>
            <div><strong>When do you usually play?</strong>
              <div class="chips" style="margin-top: 10px">
                @for (w of whenList; track w[0]) {
                  <button type="button" class="chip" [class.on]="playTimes().includes(w[0])" [attr.aria-pressed]="playTimes().includes(w[0])" (click)="toggleWhen(w[0])">{{ w[1] }}</button>
                }
              </div></div>
            <div><strong>Round length</strong>
              <div class="chips" style="margin-top: 10px">
                @for (l of lengthList; track l[0]) {
                  <button type="button" class="chip" [class.on]="roundLength() === l[0]" [attr.aria-pressed]="roundLength() === l[0]" (click)="roundLength.set(l[0])">{{ l[1] }}</button>
                }
              </div></div>
            <div><strong>Your vibe on the course</strong>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px">
                @for (v of vibeList; track v[0]) {
                  <button type="button" class="row" [class.on]="vibe() === v[0]" [attr.aria-pressed]="vibe() === v[0]" (click)="vibe.set(v[0])">
                    <strong>{{ v[1] }}</strong><small>{{ v[2] }}</small>
                  </button>
                }
              </div></div>
          }
        }

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        <div class="footer">
          <ion-button expand="block" [disabled]="!canContinue() || busy()" (click)="next()">
            @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ step() === total - 1 ? 'Finish' : 'Continue' }} }
          </ion-button>
          @if (step() === 1 || step() === 4 || step() === 5) {
            <ion-button fill="clear" color="medium" (click)="skip()">{{ step() === 1 ? "I don't have a home course" : 'Skip for now' }}</ion-button>
          }
        </div>
      </div>
    </ion-content>
  `
})
export class OnboardingPage {
  private profiles = inject(ProfileService);
  private rounds = inject(RoundsService);
  private router = inject(Router);
  private sb = inject(SupabaseService);

  readonly total = 6;
  readonly languagesList = LANGUAGES;
  readonly gendersList = GENDERS;
  readonly whenList = WHEN;
  readonly lengthList = LENGTHS;
  readonly vibeList = VIBES;

  step = signal(0);
  busy = signal(false);
  error = signal('');

  name = '';
  courses = signal<Course[]>([]);
  homeCourse = signal<Course | null>(null);
  handicapText = '';
  noHandicap = false;
  languages = signal<string[]>(['English', 'German']);
  birthYearText = '';
  gender = signal<string | null>(null);
  showAgeGender = false;
  playTimes = signal<string[]>(['weekend']);
  roundLength = signal<RoundLength>('eighteen');
  vibe = signal<Vibe>('relaxed');

  constructor() {
    // Google and Apple pass the player's name along; start from it
    const meta = this.sb.session()?.user.user_metadata ?? {};
    this.name = meta['full_name'] ?? meta['name'] ?? '';
    this.rounds.searchCourses(null).then((c) => this.courses.set(c)).catch(() => {});
  }

  async searchCourses(ev: Event) {
    const q = (ev as CustomEvent).detail?.value ?? '';
    this.courses.set(await this.rounds.searchCourses(q));
  }

  toggle(sig: ReturnType<typeof signal<string[]>>, v: string) {
    sig.update((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));
  }

  toggleWhen(key: string) {
    this.playTimes.update((list) => toggleWhen(list, key));
  }

  canContinue(): boolean {
    switch (this.step()) {
      case 0: return this.name.trim().length > 0;
      case 2: return this.noHandicap || parseHandicap(this.handicapText) !== null;
      default: return true;
    }
  }

  back() { this.step.update((s) => Math.max(0, s - 1)); }
  skip() { this.advance(); }
  next() { this.advance(); }

  private async advance() {
    if (this.step() < this.total - 1) {
      this.step.update((s) => s + 1);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const year = parseInt(this.birthYearText, 10);
      await this.profiles.save({
        displayName: this.name,
        homeCourseId: this.homeCourse()?.id ?? null,
        handicap: parseHandicap(this.handicapText),
        noHandicap: this.noHandicap,
        languages: this.languages(),
        birthYear: Number.isFinite(year) && year > 1900 ? year : null,
        gender: this.gender(),
        showAgeGender: this.showAgeGender,
        playTimes: this.playTimes(),
        roundLength: this.roundLength(),
        vibe: this.vibe()
      });
      await this.router.navigateByUrl('/tabs/find', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
