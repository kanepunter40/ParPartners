import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonInput, IonInputPasswordToggle, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoApple } from 'ionicons/icons';

/** Apple needs a paid Apple Developer account and the Supabase provider set up; flip this on once it is. */
const SHOW_APPLE = false;
import { SupabaseService } from '../../core/supabase.service';
import { SocialAuthService, SocialProvider, isCancel } from '../../core/social-auth.service';

type Tab = 'signin' | 'signup';
/** start: providers + email/password. code: confirm a new account with the emailed code. forgot: ask for a reset code. reset: code + new password. */
type View = 'start' | 'code' | 'forgot' | 'reset';

const MIN_PASSWORD = 8;

@Component({
  selector: 'app-welcome',
  imports: [RouterLink, FormsModule, IonContent, IonButton, IonInput, IonInputPasswordToggle, IonSpinner, IonIcon],
  styles: [`
    .hero { background: #2E5F5A; color: #F4F1E8; padding: calc(var(--ion-safe-area-top, 0px) + 56px) 32px 44px; text-align: center; }
    .hero .mark { display: block; width: 96px; height: 96px; margin: 0 auto 8px; }
    .hero h1 { font-size: 38px; margin: 0 0 10px; }
    .hero p { margin: 0 auto; max-width: 280px; line-height: 1.5; color: #E3ECE9; }
    .sheet { background: #F4F1E8; border-radius: 28px 28px 0 0; margin-top: -24px; padding: 24px 24px 40px; display: flex; flex-direction: column; gap: 14px; }
    .tabs { display: flex; background: #ECE8DA; border-radius: 999px; padding: 4px; }
    .tabs button { flex: 1; min-height: 40px; border: 0; border-radius: 999px; background: transparent; color: #5F5B4E; font: 600 14px 'Work Sans', sans-serif; }
    .tabs button.on { background: #fff; color: #1F3532; box-shadow: 0 1px 2px rgba(31, 53, 50, .12); }
    .sso { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 50px; border-radius: 999px; font: 600 15px 'Work Sans', sans-serif; }
    .sso:disabled { opacity: .6; }
    .google { background: #fff; color: #1F3532; border: 1px solid #D9D2BA; }
    .apple { background: #000; color: #fff; border: 1px solid #000; }
    .apple ion-icon { font-size: 20px; margin-top: -2px; }
    .or { display: flex; align-items: center; gap: 12px; color: #5F5B4E; font-size: 13px; }
    .or::before, .or::after { content: ''; flex: 1; height: 1px; background: #D9D2BA; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-weight: 600; font-size: 14px; }
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; overflow: hidden; min-height: 48px; }
    .links { display: flex; justify-content: space-between; gap: 12px; }
    .link { background: none; border: 0; padding: 8px 0; color: #2E5F5A; font: 600 14px 'Work Sans', sans-serif; text-decoration: underline; text-underline-offset: 3px; }
    .error { color: #9C5428; margin: 0; font-size: 14px; }
  `],
  template: `
    <ion-content [fullscreen]="true">
      <div class="hero">
        <svg class="mark" viewBox="0 0 100 100" aria-hidden="true">
          <ellipse cx="50" cy="74" rx="42" ry="13" fill="#F4F1E8" opacity=".28"/>
          <ellipse cx="68" cy="73" rx="9" ry="3.5" fill="#1F3532"/>
          <rect x="66.5" y="14" width="3.5" height="59" rx="1.75" fill="#F4F1E8"/>
          <path d="M70 15 L88 22.5 L70 30 Z" fill="#C97B4A"/>
          <circle cx="27" cy="62" r="11" fill="#F4F1E8"/>
          <g fill="#2E5F5A" opacity=".35"><circle cx="23" cy="58" r="1.9"/><circle cx="29" cy="56" r="1.9"/><circle cx="32" cy="62" r="1.9"/><circle cx="24" cy="65" r="1.9"/><circle cx="29" cy="67" r="1.9"/></g>
          <circle cx="47" cy="67" r="11" fill="#C97B4A"/>
          <g fill="#2E5F5A" opacity=".3"><circle cx="43" cy="63" r="1.9"/><circle cx="49" cy="61" r="1.9"/><circle cx="52" cy="67" r="1.9"/><circle cx="44" cy="70" r="1.9"/><circle cx="49" cy="72" r="1.9"/></g>
        </svg>
        <h1 aria-label="Par Partners"><span aria-hidden="true"><b style="font-weight: 700; letter-spacing: .02em;">PAR</b><span style="font-weight: 600;">tners</span></span></h1>
        <p>{{ t('welcome.tagline') }}</p>
      </div>

      <div class="sheet">
        @switch (view()) {
          @case ('start') {
            <div class="tabs" role="tablist" [attr.aria-label]="t('welcome.tabsLabel')">
              <button type="button" role="tab" [class.on]="tab() === 'signin'" [attr.aria-selected]="tab() === 'signin'" (click)="setTab('signin')">{{ t('welcome.signIn') }}</button>
              <button type="button" role="tab" [class.on]="tab() === 'signup'" [attr.aria-selected]="tab() === 'signup'" (click)="setTab('signup')">{{ t('welcome.createAccount') }}</button>
            </div>

            <button type="button" class="sso google" [disabled]="busy()" (click)="social('google')">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {{ t('welcome.google') }}
            </button>
            @if (showApple) {
              <button type="button" class="sso apple" [disabled]="busy()" (click)="social('apple')">
                <ion-icon name="logo-apple" aria-hidden="true"></ion-icon> {{ t('welcome.apple') }}
              </button>
            }

            <div class="or">{{ t('welcome.orEmail') }}</div>

            <div class="field">
              <label for="email">{{ t('welcome.email') }}</label>
              <ion-input id="email" type="email" inputmode="email" autocomplete="email" [placeholder]="t('welcome.emailPlaceholder')" [(ngModel)]="email"></ion-input>
            </div>
            <div class="field">
              <label for="password">{{ t('welcome.password') }}</label>
              <ion-input id="password" type="password" [autocomplete]="tab() === 'signup' ? 'new-password' : 'current-password'"
                [placeholder]="tab() === 'signup' ? t('welcome.passwordHint') : ''" [(ngModel)]="password" (keyup.enter)="submit()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            @if (tab() === 'signup') {
              <div class="field">
                <label for="confirm-password">{{ t('welcome.confirmPassword') }}</label>
                <ion-input id="confirm-password" type="password" autocomplete="new-password" [(ngModel)]="confirm" (keyup.enter)="submit()">
                  <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
                </ion-input>
              </div>
            }

            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <ion-button expand="block" [disabled]="busy() || !email.trim() || !password || (tab() === 'signup' && !confirm)" (click)="submit()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ tab() === 'signin' ? t('welcome.signIn') : t('welcome.createAccount') }} }
            </ion-button>

            @if (tab() === 'signin') {
              <button type="button" class="link" style="align-self: flex-start" (click)="go('forgot')">{{ t('welcome.forgot') }}</button>
            } @else {
              <p class="muted" style="font-size: 13px; text-align: center; margin: 0; line-height: 1.5">{{ t('welcome.signupNote') }} {{ t('welcome.agreeBefore') }}<a routerLink="/legal/terms">{{ t('welcome.terms') }}</a>{{ t('welcome.agreeAnd') }}<a routerLink="/legal/privacy">{{ t('welcome.privacy') }}</a>{{ t('welcome.agreeAfter') }}</p>
            }
          }

          @case ('code') {
            <h2 style="margin: 0">{{ t('welcome.checkInbox') }}</h2>
            <p class="muted" style="margin: 0">{{ t('welcome.codeSentBefore') }}<strong>{{ email }}</strong>{{ t('welcome.codeSentAfter') }}</p>
            <div class="field">
              <label for="code">{{ t('welcome.code') }}</label>
              <ion-input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" [(ngModel)]="code" (keyup.enter)="verify()"></ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            @if (notice()) { <p class="muted" role="status" style="margin: 0; font-size: 14px">{{ notice() }}</p> }
            <ion-button expand="block" [disabled]="busy() || code.trim().length < 6" (click)="verify()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('welcome.confirm') }} }
            </ion-button>
            <div class="links">
              <button type="button" class="link" (click)="go('start')">{{ t('common.back') }}</button>
              <button type="button" class="link" [disabled]="busy()" (click)="resend()">{{ t('welcome.newCode') }}</button>
            </div>
          }

          @case ('forgot') {
            <h2 style="margin: 0">{{ t('welcome.resetTitle') }}</h2>
            <p class="muted" style="margin: 0">{{ t('welcome.resetIntro') }}</p>
            <div class="field">
              <label for="reset-email">{{ t('welcome.email') }}</label>
              <ion-input id="reset-email" type="email" inputmode="email" autocomplete="email" [placeholder]="t('welcome.emailPlaceholder')" [(ngModel)]="email" (keyup.enter)="sendReset()"></ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <ion-button expand="block" [disabled]="busy() || !email.trim()" (click)="sendReset()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('welcome.emailMeCode') }} }
            </ion-button>
            <button type="button" class="link" style="align-self: flex-start" (click)="go('start')">{{ t('welcome.backToSignIn') }}</button>
          }

          @case ('reset') {
            <h2 style="margin: 0">{{ t('welcome.newPasswordTitle') }}</h2>
            <p class="muted" style="margin: 0">{{ t('welcome.resetCodeBefore') }}<strong>{{ email }}</strong>{{ t('welcome.resetCodeAfter') }}</p>
            <div class="field">
              <label for="reset-code">{{ t('welcome.code') }}</label>
              <ion-input id="reset-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" [(ngModel)]="code"></ion-input>
            </div>
            <div class="field">
              <label for="new-password">{{ t('welcome.newPassword') }}</label>
              <ion-input id="new-password" type="password" autocomplete="new-password" [placeholder]="t('welcome.passwordHint')" [(ngModel)]="password" (keyup.enter)="reset()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            <div class="field">
              <label for="confirm-new-password">{{ t('welcome.confirmNewPassword') }}</label>
              <ion-input id="confirm-new-password" type="password" autocomplete="new-password" [(ngModel)]="confirm" (keyup.enter)="reset()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            @if (notice()) { <p class="muted" role="status" style="margin: 0; font-size: 14px">{{ notice() }}</p> }
            <ion-button expand="block" [disabled]="busy() || code.trim().length < 6 || !password || !confirm" (click)="reset()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ t('welcome.saveAndSignIn') }} }
            </ion-button>
            <div class="links">
              <button type="button" class="link" (click)="go('forgot')">{{ t('common.back') }}</button>
              <button type="button" class="link" [disabled]="busy()" (click)="sendReset()">{{ t('welcome.newCode') }}</button>
            </div>
          }
        }
      </div>
    </ion-content>
  `
})
export class WelcomePage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private sb = inject(SupabaseService);
  private socialAuth = inject(SocialAuthService);
  private router = inject(Router);

  readonly showApple = SHOW_APPLE;
  tab = signal<Tab>('signin');
  view = signal<View>('start');
  busy = signal(false);
  error = signal('');
  notice = signal('');
  email = '';
  password = '';
  confirm = '';
  code = '';

  constructor() {
    addIcons({ logoApple });
  }

  setTab(t: Tab) {
    this.tab.set(t);
    this.error.set('');
    this.confirm = '';
  }

  go(v: View) {
    this.view.set(v);
    this.error.set('');
    this.notice.set('');
    this.code = '';
    if (v === 'forgot' || v === 'reset') this.password = this.confirm = '';
  }

  /** Runs an auth call with the spinner on; returns false (and shows the message) on failure. */
  private async attempt(fn: () => Promise<{ error: { message: string } | null } | void>): Promise<boolean> {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fn();
      if (res && res.error) throw res.error;
      return true;
    } catch (e) {
      if (!isCancel(e)) this.error.set(this.message(e));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private message(e: unknown): string {
    const m = (e as Error)?.message ?? '';
    if (m.startsWith('auth.')) return this.t(m);
    if (/invalid login credentials/i.test(m)) return this.t('welcome.err.wrongPassword');
    if (/token has expired|invalid/i.test(m) && this.view() !== 'start') return this.t('welcome.err.badCode');
    if (/rate limit|security purposes/i.test(m)) return this.t('welcome.err.rateLimit');
    return m || this.t('common.error');
  }

  private done() {
    this.router.navigateByUrl('/tabs', { replaceUrl: true });
  }

  /** Checks a new password before it's sent; shows what's wrong. */
  private badNewPassword(): boolean {
    if (this.password.length < MIN_PASSWORD) this.error.set(this.t('welcome.err.short', { min: MIN_PASSWORD }));
    else if (this.password !== this.confirm) this.error.set(this.t('welcome.err.mismatch'));
    else return false;
    return true;
  }

  async social(provider: SocialProvider) {
    if (await this.attempt(() => this.socialAuth.signIn(provider))) {
      // Native sign-in has a session now; web and Apple-on-Android come back through a redirect
      if (this.sb.session()) this.done();
    }
  }

  async submit() {
    const email = this.email.trim();
    if (this.tab() === 'signin') {
      let unconfirmed = false;
      const ok = await this.attempt(async () => {
        const res = await this.sb.signInWithPassword(email, this.password);
        unconfirmed = /not confirmed/i.test(res.error?.message ?? '');
        return unconfirmed ? undefined : res;
      });
      if (unconfirmed) {
        // Signed up but never confirmed: send a fresh code and pick up from there
        if (await this.attempt(() => this.sb.resendSignupCode(email))) this.go('code');
      } else if (ok) this.done();
      return;
    }

    if (this.badNewPassword()) return;
    let session = false;
    const ok = await this.attempt(async () => {
      const res = await this.sb.signUp(email, this.password, this.i18n.lang());
      if (res.data.user && !res.data.user.identities?.length) throw new Error(this.t('welcome.err.exists'));
      session = !!res.data.session;
      return res;
    });
    if (!ok) return;
    if (session) this.done();
    else this.go('code');
  }

  async resend() {
    const email = this.email.trim();
    const ok = await this.attempt(() => this.sb.resendSignupCode(email));
    if (ok) this.notice.set(this.t('welcome.codeResent'));
  }

  async verify() {
    if (await this.attempt(() => this.sb.verifyEmailCode(this.email.trim(), this.code.trim(), 'signup'))) this.done();
  }

  async sendReset() {
    if (await this.attempt(() => this.sb.sendPasswordReset(this.email.trim()))) {
      if (this.view() === 'reset') this.notice.set(this.t('welcome.codeResent'));
      else this.go('reset');
    }
  }

  /** The code signs you in; the new password is then saved on the account. */
  async reset() {
    if (this.badNewPassword()) return;
    const ok = await this.attempt(async () => {
      const res = await this.sb.verifyEmailCode(this.email.trim(), this.code.trim(), 'recovery');
      if (res.error) return res;
      return this.sb.setPassword(this.password);
    });
    if (ok) this.done();
  }
}
