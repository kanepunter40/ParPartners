import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonProgressBar, IonSpinner } from '@ionic/angular/standalone';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { RoundsService } from '../../core/rounds.service';
import { Course } from '../../core/models';
import { GENDERS, LANGUAGES, LENGTHS, RoundLength, VIBES, Vibe, WHEN, parseHandicap, toggleWhen, langKey, genderKey } from '../../core/profile-options';


@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, IonContent, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonProgressBar, IonSpinner],
  styles: [`
    .wrap { padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 20px; min-height: 100%; }
    .eyebrow { font-size: 14px; font-weight: 600; color: var(--pp-deep); }
    h2 { font-size: 28px; margin: 4px 0 8px; line-height: 1.2; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { min-height: 44px; padding: 0 18px; border-radius: 10px; border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); color: var(--pp-ink); font: 600 14px 'Hanken Grotesk Variable', sans-serif; }
    .chip.on { background: var(--pp-deep); border-color: var(--pp-deep); color: #fff; }
    .row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; min-height: 56px; padding: 10px 16px; border-radius: var(--pp-radius-control); border: 1px solid var(--pp-rule); background: var(--pp-surface); text-align: left; color: var(--pp-ink); font-family: inherit; }
    .row.on { background: var(--pp-deep-soft); border-color: var(--pp-deep); }
    .row small { color: var(--pp-ink2); }
    ion-input { --background: var(--pp-surface); --padding-start: 14px; border: 1px solid var(--pp-rule-strong); border-radius: var(--pp-radius-control); overflow: hidden; min-height: 48px; }
    .footer { margin-top: auto; display: flex; flex-direction: column; gap: 4px; }
    .nav { display: flex; align-items: center; gap: 12px; padding: 12px 16px 0; }
    .nav button { width: 44px; height: 44px; border: 0; background: none; font-size: 22px; }
  `],
  template: `
    <ion-content>
      <div class="nav">
        <button type="button" [attr.aria-label]="t('common.back')" [style.visibility]="step() === 0 ? 'hidden' : 'visible'" (click)="back()">&#8592;</button>
        <ion-progress-bar [value]="(step() + 1) / total"></ion-progress-bar>
        <span class="muted" style="font-size: 13px">{{ step() + 1 }}/{{ total }}</span>
      </div>

      <div class="wrap">
        @switch (step()) {
          @case (0) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.nameQ') }}</h2></div>
            <ion-input [attr.aria-label]="t('edit.name')" [placeholder]="t('onboarding.namePlaceholder')" autocomplete="name" [(ngModel)]="name"></ion-input>
          }
          @case (1) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.courseQ') }}</h2>
              <p class="muted" style="margin: 0">{{ t('onboarding.courseHint') }}</p></div>
            <ion-searchbar [placeholder]="t('find.searchCourse')" [debounce]="250" (ionInput)="searchCourses($event)"></ion-searchbar>
            <div style="display: flex; flex-direction: column; gap: 10px">
              @for (c of courses(); track c.id) {
                <button type="button" class="row" [class.on]="homeCourse()?.id === c.id" [attr.aria-pressed]="homeCourse()?.id === c.id" (click)="homeCourse.set(c)">
                  <strong>{{ c.name }}</strong><small>{{ c.city }}</small>
                </button>
              }
            </div>
          }
          @case (2) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.hcpQ') }}</h2>
              <p class="muted" style="margin: 0">{{ t('onboarding.hcpHint') }}</p></div>
            <ion-input [attr.aria-label]="t('edit.hcpIndex')" inputmode="decimal" [placeholder]="t('edit.hcpPlaceholder')" [disabled]="noHandicap" [(ngModel)]="handicapText"></ion-input>
            <ion-checkbox [(ngModel)]="noHandicap" labelPlacement="end">{{ t('edit.noHcp') }}</ion-checkbox>
          }
          @case (3) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.langQ') }}</h2>
              <p class="muted" style="margin: 0">{{ t('onboarding.langHint') }}</p></div>
            <div class="chips">
              @for (l of languagesList; track l) {
                <button type="button" class="chip" [class.on]="languages().includes(l)" [attr.aria-pressed]="languages().includes(l)" (click)="toggle(languages, l)">{{ t(langKey(l)) }}</button>
              }
            </div>
          }
          @case (4) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.aboutQ') }}</h2>
              <p class="muted" style="margin: 0">{{ t('onboarding.aboutHint') }}</p></div>
            <div><strong>{{ t('edit.birthYear') }}</strong>
              <ion-input [attr.aria-label]="t('edit.birthYear')" inputmode="numeric" maxlength="4" [placeholder]="t('edit.birthPlaceholder')" [(ngModel)]="birthYearText" style="margin-top: 6px"></ion-input></div>
            <div><strong id="g">{{ t('edit.gender') }}</strong>
              <div class="chips" role="group" aria-labelledby="g" style="margin-top: 10px">
                @for (g of gendersList; track g) {
                  <button type="button" class="chip" [class.on]="gender() === g" [attr.aria-pressed]="gender() === g" (click)="gender.set(gender() === g ? null : g)">{{ t(genderKey(g)) }}</button>
                }
              </div></div>
            <ion-toggle [(ngModel)]="showAgeGender">{{ t('edit.showOnProfile') }}</ion-toggle>
          }
          @case (5) {
            <div><div class="eyebrow">{{ t('onboarding.eyebrow') }}</div><h2>{{ t('onboarding.playQ') }}</h2>
              <p class="muted" style="margin: 0">{{ t('onboarding.playHint') }}</p></div>
            <div><strong>{{ t('onboarding.whenQ') }}</strong>
              <div class="chips" style="margin-top: 10px">
                @for (w of whenList; track w[0]) {
                  <button type="button" class="chip" [class.on]="playTimes().includes(w[0])" [attr.aria-pressed]="playTimes().includes(w[0])" (click)="toggleWhen(w[0])">{{ t(w[1]) }}</button>
                }
              </div></div>
            <div><strong>{{ t('edit.roundLength') }}</strong>
              <div class="chips" style="margin-top: 10px">
                @for (l of lengthList; track l[0]) {
                  <button type="button" class="chip" [class.on]="roundLength() === l[0]" [attr.aria-pressed]="roundLength() === l[0]" (click)="roundLength.set(l[0])">{{ t(l[1]) }}</button>
                }
              </div></div>
            <div><strong>{{ t('edit.vibe') }}</strong>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px">
                @for (v of vibeList; track v[0]) {
                  <button type="button" class="row" [class.on]="vibe() === v[0]" [attr.aria-pressed]="vibe() === v[0]" (click)="vibe.set(v[0])">
                    <strong>{{ t(v[1]) }}</strong><small>{{ t(v[2]) }}</small>
                  </button>
                }
              </div></div>
          }
        }

        @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }

        <div class="footer">
          <ion-button expand="block" [disabled]="!canContinue() || busy()" (click)="next()">
            @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ step() === total - 1 ? t('onboarding.finish') : t('onboarding.continue') }} }
          </ion-button>
          @if (step() === 1 || step() === 4 || step() === 5) {
            <ion-button fill="clear" color="medium" (click)="skip()">{{ step() === 1 ? t('onboarding.noHome') : t('onboarding.skip') }}</ion-button>
          }
        </div>
      </div>
    </ion-content>
  `
})
export class OnboardingPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
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
  readonly langKey = langKey;
  readonly genderKey = genderKey;

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
      this.error.set(this.i18n.error(e, 'common.error'));
    } finally {
      this.busy.set(false);
    }
  }
}
