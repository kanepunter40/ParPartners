import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonSpinner } from '@ionic/angular/standalone';
import { ProfileService } from '../../core/profile.service';
import { RoundsService } from '../../core/rounds.service';
import { Course } from '../../core/models';
import { AvatarComponent } from '../../core/avatar.component';
import { GENDERS, LANGUAGES, LENGTHS, RoundLength, VIBES, Vibe, WHEN, genderKey, langKey, parseHandicap, toggleWhen } from '../../core/profile-options';

@Component({
  selector: 'app-profile-edit',
  imports: [AvatarComponent, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonInput, IonSearchbar, IonToggle, IonCheckbox, IonSpinner],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 28px; }
    fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    legend { font-weight: 700; font-size: 17px; padding: 0; margin-bottom: 10px; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font: 600 14px 'Work Sans', sans-serif; }
    .chip.on { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; min-height: 56px; padding: 10px 16px; border-radius: 14px; border: 1px solid #E6DFC9; background: #fff; text-align: left; color: #1F3532; font-family: inherit; }
    .row.on { background: #E3ECE9; border-color: #2E5F5A; }
    .row small { color: #5F5B4E; }
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; overflow: hidden; min-height: 48px; }
    ion-searchbar { padding: 0; }
    .photo { display: flex; align-items: center; gap: 18px; }
    .photo-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .footer { position: sticky; bottom: 0; padding: 14px 0 24px; background: #F4F1E8; display: flex; flex-direction: column; gap: 6px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" [text]="t('tabs.profile')"></ion-back-button></ion-buttons>
        <ion-title>{{ t('profile.edit') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (loaded()) {
        <div class="page-pad wrap">
          <fieldset>
            <legend>{{ t('edit.photo') }}</legend>
            <div class="photo">
              <app-avatar [name]="name || '?'" [path]="avatar()" [size]="88" />
              <div class="photo-actions">
                <input #picker type="file" accept="image/*" hidden (change)="pickPhoto($event)">
                <ion-button fill="outline" size="small" [disabled]="photoBusy()" (click)="picker.click()">
                  @if (photoBusy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ avatar() ? t('edit.changePhoto') : t('edit.addPhoto') }} }
                </ion-button>
                @if (avatar() && !photoBusy()) {
                  <ion-button fill="clear" size="small" color="medium" (click)="removePhoto()">{{ t('edit.removePhoto') }}</ion-button>
                }
              </div>
            </div>
            @if (photoError()) { <p role="alert" style="color: #9C5428; margin: 0">{{ photoError() }}</p> }
            @else if (!avatar()) { <span class="muted" style="font-size: 13px">{{ t('edit.initialsHint') }}</span> }
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.name') }}</legend>
            <ion-input [attr.aria-label]="t('edit.name')" autocomplete="name" maxlength="60" [(ngModel)]="name"></ion-input>
          </fieldset>

          <fieldset>
            <legend>{{ t('profile.homeCourse') }}</legend>
            @if (homeCourse(); as h) {
              <div class="row on"><strong>{{ h.name }}</strong><small>{{ h.city }}</small></div>
              <ion-button fill="clear" size="small" color="medium" style="align-self: flex-start" (click)="homeCourse.set(null)">{{ t('edit.removeHome') }}</ion-button>
            }
            <ion-searchbar [placeholder]="homeCourse() ? t('edit.searchChange') : t('find.searchCourse')" [debounce]="250" (ionInput)="searchCourses($event)"></ion-searchbar>
            @for (c of courses(); track c.id) {
              @if (c.id !== homeCourse()?.id) {
                <button type="button" class="row" (click)="pickCourse(c)"><strong>{{ c.name }}</strong><small>{{ c.city }}</small></button>
              }
            }
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.hcpIndex') }}</legend>
            <ion-input [attr.aria-label]="t('edit.hcpIndex')" inputmode="decimal" [placeholder]="t('edit.hcpPlaceholder')" [disabled]="noHandicap" [(ngModel)]="handicapText"></ion-input>
            <ion-checkbox [(ngModel)]="noHandicap" labelPlacement="end">{{ t('edit.noHcp') }}</ion-checkbox>
          </fieldset>

          <fieldset>
            <legend>{{ t('profile.languages') }}</legend>
            <div class="chips">
              @for (l of languagesList; track l) {
                <button type="button" class="chip" [class.on]="languages().includes(l)" [attr.aria-pressed]="languages().includes(l)" (click)="toggleLanguage(l)">{{ t(langKey(l)) }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.aboutYou') }}</legend>
            <span class="muted" style="margin-top: -6px">{{ t('edit.aboutHint') }}</span>
            <strong>{{ t('edit.birthYear') }}</strong>
            <ion-input [attr.aria-label]="t('edit.birthYear')" inputmode="numeric" maxlength="4" [placeholder]="t('edit.birthPlaceholder')" [(ngModel)]="birthYearText"></ion-input>
            <strong id="gender-label">{{ t('edit.gender') }}</strong>
            <div class="chips" role="group" aria-labelledby="gender-label">
              @for (g of gendersList; track g) {
                <button type="button" class="chip" [class.on]="gender() === g" [attr.aria-pressed]="gender() === g" (click)="gender.set(gender() === g ? null : g)">{{ t(genderKey(g)) }}</button>
              }
            </div>
            @if (gender() !== 'Man') {
              <span class="muted" style="font-size: 13px; margin-top: -6px">{{ t('edit.genderHint') }}</span>
            }
            <ion-toggle [(ngModel)]="showAgeGender">{{ t('edit.showOnProfile') }}</ion-toggle>
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.whenPlay') }}</legend>
            <div class="chips">
              @for (w of whenList; track w[0]) {
                <button type="button" class="chip" [class.on]="playTimes().includes(w[0])" [attr.aria-pressed]="playTimes().includes(w[0])" (click)="playTimes.set(toggleWhen(playTimes(), w[0]))">{{ t(w[1]) }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.roundLength') }}</legend>
            <div class="chips">
              @for (l of lengthList; track l[0]) {
                <button type="button" class="chip" [class.on]="roundLength() === l[0]" [attr.aria-pressed]="roundLength() === l[0]" (click)="roundLength.set(l[0])">{{ t(l[1]) }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend>{{ t('edit.vibe') }}</legend>
            @for (v of vibeList; track v[0]) {
              <button type="button" class="row" [class.on]="vibe() === v[0]" [attr.aria-pressed]="vibe() === v[0]" (click)="vibe.set(v[0])">
                <strong>{{ t(v[1]) }}</strong><small>{{ t(v[2]) }}</small>
              </button>
            }
          </fieldset>

          <div class="footer">
            @if (problem(); as p) { <p class="muted" style="margin: 0">{{ p }}</p> }
            @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }
            <ion-button expand="block" [disabled]="!!problem() || busy()" (click)="save()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('common.save') }} }
            </ion-button>
          </div>
        </div>
      } @else if (error()) {
        <p role="alert" class="page-pad" style="color: #9C5428">{{ error() }}</p>
      } @else {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      }
    </ion-content>
  `
})
export class ProfileEditPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private profiles = inject(ProfileService);
  private rounds = inject(RoundsService);
  private router = inject(Router);

  readonly languagesList = LANGUAGES;
  readonly gendersList = GENDERS;
  readonly whenList = WHEN;
  readonly lengthList = LENGTHS;
  readonly vibeList = VIBES;
  readonly toggleWhen = toggleWhen;
  readonly langKey = langKey;
  readonly genderKey = genderKey;

  loaded = signal(false);
  busy = signal(false);
  error = signal('');

  name = '';
  /** Storage path of my picture; saved straight away, separately from the Save button. */
  avatar = signal<string | null>(null);
  photoBusy = signal(false);
  photoError = signal('');
  courses = signal<Course[]>([]);
  homeCourse = signal<Course | null>(null);
  handicapText = '';
  noHandicap = false;
  languages = signal<string[]>([]);
  birthYearText = '';
  gender = signal<string | null>(null);
  showAgeGender = false;
  playTimes = signal<string[]>([]);
  roundLength = signal<RoundLength>('either');
  vibe = signal<Vibe>('relaxed');

  async ionViewWillEnter() {
    this.error.set('');
    try {
      const [d, me] = await Promise.all([this.profiles.details(), this.profiles.load(true)]);
      this.avatar.set(me?.avatar_url ?? null);
      this.name = d.displayName;
      this.handicapText = d.handicap !== null ? this.i18n.num(d.handicap, 1) : '';
      this.noHandicap = d.noHandicap;
      this.languages.set(d.languages);
      this.birthYearText = d.birthYear !== null ? String(d.birthYear) : '';
      this.gender.set(d.gender);
      this.showAgeGender = d.showAgeGender;
      this.playTimes.set(d.playTimes);
      this.roundLength.set(d.roundLength);
      this.vibe.set(d.vibe);
      this.homeCourse.set(d.homeCourseId ? await this.rounds.getCourse(d.homeCourseId) : null);
      this.loaded.set(true);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'profile.loadError'));
    }
  }

  async pickPhoto(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.photo(async () => this.avatar.set(await this.profiles.setAvatar(file)));
  }

  async removePhoto() {
    await this.photo(async () => {
      await this.profiles.clearAvatar();
      this.avatar.set(null);
    });
  }

  private async photo(fn: () => Promise<void>) {
    this.photoBusy.set(true);
    this.photoError.set('');
    try {
      await fn();
    } catch (e: any) {
      const m: string | undefined = e?.message;
      this.photoError.set(this.i18n.error(e, 'photo.updateError'));
    } finally {
      this.photoBusy.set(false);
    }
  }

  async searchCourses(ev: Event) {
    const q = ((ev as CustomEvent).detail?.value ?? '').trim();
    this.courses.set(q ? await this.rounds.searchCourses(q) : []);
  }

  pickCourse(c: Course) {
    this.homeCourse.set(c);
    this.courses.set([]);
  }

  toggleLanguage(l: string) {
    this.languages.update((list) => (list.includes(l) ? list.filter((x) => x !== l) : [...list, l]));
  }

  private birthYear(): number | null {
    const y = parseInt(this.birthYearText, 10);
    return Number.isFinite(y) ? y : null;
  }

  /** Why Save is disabled, if it is. */
  problem(): string | null {
    if (!this.name.trim()) return this.t('edit.problem.name');
    if (!this.noHandicap && parseHandicap(this.handicapText) === null) return this.t('edit.problem.hcp');
    const y = this.birthYear();
    if (this.birthYearText.trim() && (y === null || y < 1900 || y > new Date().getFullYear())) return this.t('edit.problem.year');
    return null;
  }

  async save() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.profiles.save({
        displayName: this.name,
        homeCourseId: this.homeCourse()?.id ?? null,
        handicap: parseHandicap(this.handicapText),
        noHandicap: this.noHandicap,
        languages: this.languages(),
        birthYear: this.birthYear(),
        gender: this.gender(),
        showAgeGender: this.showAgeGender,
        playTimes: this.playTimes(),
        roundLength: this.roundLength(),
        vibe: this.vibe()
      });
      await this.router.navigateByUrl('/tabs/profile', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'edit.saveError'));
    } finally {
      this.busy.set(false);
    }
  }
}
