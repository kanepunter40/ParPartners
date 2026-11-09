import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonInput, IonInputPasswordToggle, IonSpinner } from '@ionic/angular/standalone';
import { SupabaseService } from '../../core/supabase.service';
import { ProfileService } from '../../core/profile.service';
import { Lang } from '../../core/i18n.service';

const MIN_PASSWORD = 8;
const FEEDBACK = 'mailto:parpartners.app@gmail.com?subject=PARtners%20feedback';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonInput, IonInputPasswordToggle, IonSpinner],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 28px; padding-bottom: 32px; }
    .section { display: flex; flex-direction: column; gap: 8px; }
    .label { font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em; }
    .group { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 54px; padding: 12px 16px;
            box-sizing: border-box; border: 0; background: none; text-align: left; color: #1F3532; font: 400 16px 'Work Sans', sans-serif; text-decoration: none; }
    .item + .item, .item + .pw, .pw + .item { border-top: 1px solid #E6DFC9; }
    .item small { color: #5F5B4E; font-size: 14px; text-align: right; overflow-wrap: anywhere; }
    .chev { color: #5F5B4E; font-size: 22px; line-height: 1; }
    .pw { display: flex; flex-direction: column; gap: 10px; padding: 4px 16px 16px; }
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; overflow: hidden; min-height: 48px; }
    .error { color: #9C5428; margin: 0; font-size: 14px; }
    .danger { display: flex; flex-direction: column; gap: 6px; }
    .tick { color: #2E5F5A; font-weight: 700; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" [text]="t('tabs.profile')"></ion-back-button></ion-buttons>
        <ion-title>{{ t('settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad wrap">
        <div class="section">
          <span class="label" id="lang-label">{{ t('settings.language') }}</span>
          <div class="group" role="radiogroup" aria-labelledby="lang-label">
            @for (o of langOptions; track o[0]) {
              <button type="button" class="item" role="radio" [attr.aria-checked]="i18n.lang() === o[0]" (click)="i18n.setLang(o[0])">
                <span>{{ o[1] }}</span>
                @if (i18n.lang() === o[0]) { <span class="tick" aria-hidden="true">✓</span> }
              </button>
            }
          </div>
        </div>

        <div class="section">
          <span class="label">{{ t('settings.account') }}</span>
          <div class="group">
            <div class="item"><span>{{ t('welcome.email') }}</span><small>{{ email() }}</small></div>
            <div class="item"><span>{{ t('settings.signedInWith') }}</span><small>{{ providers() }}</small></div>
            <button type="button" class="item" [attr.aria-expanded]="pwOpen()" (click)="togglePassword()">
              <span>{{ hasPassword() ? t('settings.changePassword') : t('settings.setPassword') }}</span><span class="chev" aria-hidden="true">{{ pwOpen() ? '−' : '+' }}</span>
            </button>
            @if (pwOpen()) {
              <div class="pw">
                @if (!hasPassword()) { <span class="muted" style="font-size: 14px">{{ t('settings.setPasswordHint') }}</span> }
                <ion-input [attr.aria-label]="t('welcome.newPassword')" type="password" autocomplete="new-password" [placeholder]="t('settings.newPasswordPlaceholder')" [(ngModel)]="password">
                  <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
                </ion-input>
                <ion-input [attr.aria-label]="t('welcome.confirmNewPassword')" type="password" autocomplete="new-password" [placeholder]="t('welcome.confirmNewPassword')" [(ngModel)]="confirm" (keyup.enter)="savePassword()">
                  <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
                </ion-input>
                @if (pwError()) { <p class="error" role="alert">{{ pwError() }}</p> }
                <ion-button expand="block" [disabled]="pwBusy() || !password || !confirm" (click)="savePassword()">
                  @if (pwBusy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('settings.savePassword') }} }
                </ion-button>
              </div>
            }
            @if (pwSaved()) { <div class="item" role="status"><small style="text-align: left">{{ t('settings.passwordSaved') }}</small></div> }
            <button type="button" class="item" (click)="signOut()"><span>{{ t('settings.logOut') }}</span></button>
          </div>
        </div>

        <div class="section">
          <span class="label">{{ t('settings.about') }}</span>
          <div class="group">
            <a class="item" routerLink="/legal/privacy"><span>{{ t('welcome.privacy') }}</span><span class="chev" aria-hidden="true">&#8250;</span></a>
            <a class="item" routerLink="/legal/terms"><span>{{ t('settings.terms') }}</span><span class="chev" aria-hidden="true">&#8250;</span></a>
            <a class="item" routerLink="/legal/imprint"><span>{{ t('settings.imprint') }}</span><span class="chev" aria-hidden="true">&#8250;</span></a>
            <a class="item" [href]="feedback"><span>{{ t('settings.feedback') }}</span><span class="chev" aria-hidden="true">&#8250;</span></a>
            <a class="item" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
              <span>{{ t('settings.courseData') }}</span><small>{{ t('settings.osm') }}</small>
            </a>
            <div class="item"><span>{{ t('settings.version') }}</span><small>{{ version() }}</small></div>
          </div>
        </div>

        <div class="section danger">
          <span class="label">{{ t('settings.deleteAccount') }}</span>
          <ion-button fill="outline" expand="block" style="--color: #9C5428; --border-color: #9C5428" [disabled]="deleting()" (click)="deleteAccount()">
            @if (deleting()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ confirmDelete() ? t('settings.deleteConfirm') : t('settings.deleteMine') }} }
          </ion-button>
          <p class="muted" style="margin: 0; font-size: 14px">
            {{ t('settings.deleteText') }}
          </p>
          @if (deleteError()) { <p class="error" role="alert">{{ deleteError() }}</p> }
        </div>
      </div>
    </ion-content>
  `
})
export class SettingsPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private sb = inject(SupabaseService);
  private profiles = inject(ProfileService);
  private router = inject(Router);

  readonly feedback = FEEDBACK;
  /** Language names are shown in their own language. */
  readonly langOptions: [Lang, string][] = [['en', 'English'], ['de', 'Deutsch']];
  private user = computed(() => this.sb.session()?.user);
  email = computed(() => this.user()?.email ?? '');
  private providerList = computed<string[]>(() => this.user()?.app_metadata?.['providers'] ?? []);
  hasPassword = computed(() => this.providerList().includes('email'));
  providers = computed(() => this.providerList().map((p) => (p === 'email' ? this.t('welcome.email') : p[0].toUpperCase() + p.slice(1))).join(this.t('settings.and')) || this.t('welcome.email'));
  version = signal('');

  pwOpen = signal(false);
  pwBusy = signal(false);
  pwError = signal('');
  pwSaved = signal(false);
  password = '';
  confirm = '';

  confirmDelete = signal(false);
  deleting = signal(false);
  deleteError = signal('');

  async ionViewWillEnter() {
    if (Capacitor.isNativePlatform()) {
      const info = await App.getInfo();
      this.version.set(`${info.version} (${info.build})`);
    } else {
      this.version.set(this.t('settings.webPreview'));
    }
  }

  togglePassword() {
    this.pwOpen.update((o) => !o);
    this.pwError.set('');
    this.pwSaved.set(false);
    this.password = this.confirm = '';
  }

  async savePassword() {
    if (this.password.length < MIN_PASSWORD) { this.pwError.set(this.t('welcome.err.short', { min: MIN_PASSWORD })); return; }
    if (this.password !== this.confirm) { this.pwError.set(this.t('welcome.err.mismatch')); return; }
    this.pwBusy.set(true);
    this.pwError.set('');
    try {
      const { error } = await this.sb.setPassword(this.password);
      if (error) throw error;
      await this.sb.client.auth.refreshSession(); // picks up "email" as a sign-in method
      this.pwOpen.set(false);
      this.pwSaved.set(true);
      this.password = this.confirm = '';
    } catch (e: any) {
      this.pwError.set(/same/i.test(e?.message ?? '') ? this.t('settings.samePassword') : this.i18n.error(e, 'settings.passwordError'));
    } finally {
      this.pwBusy.set(false);
    }
  }

  async signOut() {
    await this.sb.signOut();
    this.profiles.clear();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }

  /** Takes a second tap within 4 seconds. */
  async deleteAccount() {
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      setTimeout(() => this.confirmDelete.set(false), 4000);
      return;
    }
    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await this.profiles.deleteAccount();
      await this.sb.client.auth.signOut({ scope: 'local' }); // the user is already gone server-side
      this.profiles.clear();
      await this.router.navigateByUrl('/welcome', { replaceUrl: true });
    } catch (e: any) {
      this.deleteError.set(this.i18n.error(e, 'settings.deleteError'));
    } finally {
      this.deleting.set(false);
      this.confirmDelete.set(false);
    }
  }
}
