import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonInput, IonInputPasswordToggle, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoApple } from 'ionicons/icons';
import { SupabaseService } from '../../core/supabase.service';
import { SocialAuthService, SocialProvider, isCancel } from '../../core/social-auth.service';

type Tab = 'signin' | 'signup';
/** start: providers + email/password. code: type the emailed code. forgot: ask for a reset code. reset: code + new password. */
type View = 'start' | 'code' | 'forgot' | 'reset';
type CodeType = 'email' | 'signup';

const MIN_PASSWORD = 8;

@Component({
  selector: 'app-welcome',
  imports: [FormsModule, IonContent, IonButton, IonInput, IonInputPasswordToggle, IonSpinner, IonIcon],
  styles: [`
    .hero { background: #2E5F5A; color: #F4F1E8; padding: calc(var(--ion-safe-area-top, 0px) + 56px) 32px 44px; text-align: center; }
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
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; min-height: 48px; }
    .links { display: flex; justify-content: space-between; gap: 12px; }
    .link { background: none; border: 0; padding: 8px 0; color: #2E5F5A; font: 600 14px 'Work Sans', sans-serif; text-decoration: underline; text-underline-offset: 3px; }
    .error { color: #9C5428; margin: 0; font-size: 14px; }
  `],
  template: `
    <ion-content [fullscreen]="true">
      <div class="hero">
        <h1 aria-label="Par Partners"><span aria-hidden="true"><b style="font-weight: 700; letter-spacing: .02em;">PAR</b><span style="font-weight: 600;">tners</span></span></h1>
        <p>Find playing partners near you, or post a round and fill the last spot.</p>
      </div>

      <div class="sheet">
        @switch (view()) {
          @case ('start') {
            <div class="tabs" role="tablist" aria-label="Sign in or create an account">
              <button type="button" role="tab" [class.on]="tab() === 'signin'" [attr.aria-selected]="tab() === 'signin'" (click)="setTab('signin')">Sign in</button>
              <button type="button" role="tab" [class.on]="tab() === 'signup'" [attr.aria-selected]="tab() === 'signup'" (click)="setTab('signup')">Create account</button>
            </div>

            <button type="button" class="sso google" [disabled]="busy()" (click)="social('google')">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
            <button type="button" class="sso apple" [disabled]="busy()" (click)="social('apple')">
              <ion-icon name="logo-apple" aria-hidden="true"></ion-icon> Continue with Apple
            </button>

            <div class="or">or with email</div>

            <div class="field">
              <label for="email">Email</label>
              <ion-input id="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" [(ngModel)]="email"></ion-input>
            </div>
            <div class="field">
              <label for="password">Password</label>
              <ion-input id="password" type="password" [autocomplete]="tab() === 'signup' ? 'new-password' : 'current-password'"
                [placeholder]="tab() === 'signup' ? 'At least 8 characters' : ''" [(ngModel)]="password" (keyup.enter)="submit()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            @if (tab() === 'signup') {
              <div class="field">
                <label for="confirm-password">Confirm password</label>
                <ion-input id="confirm-password" type="password" autocomplete="new-password" [(ngModel)]="confirm" (keyup.enter)="submit()">
                  <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
                </ion-input>
              </div>
            }

            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <ion-button expand="block" [disabled]="busy() || !email.trim() || !password || (tab() === 'signup' && !confirm)" (click)="submit()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ tab() === 'signin' ? 'Sign in' : 'Create account' }} }
            </ion-button>

            @if (tab() === 'signin') {
              <div class="links">
                <button type="button" class="link" (click)="go('forgot')">Forgot password?</button>
                <button type="button" class="link" [disabled]="busy()" (click)="sendCode()">Email me a code instead</button>
              </div>
            } @else {
              <p class="muted" style="font-size: 13px; text-align: center; margin: 0">We'll email you a code to confirm it's you.</p>
            }
          }

          @case ('code') {
            <h2 style="margin: 0">Check your inbox</h2>
            <p class="muted" style="margin: 0">We sent a 6-digit code to <strong>{{ email }}</strong>{{ codeType() === 'signup' ? ' to confirm your account' : '' }}.</p>
            <div class="field">
              <label for="code">Code</label>
              <ion-input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" [(ngModel)]="code" (keyup.enter)="verify()"></ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            @if (notice()) { <p class="muted" role="status" style="margin: 0; font-size: 14px">{{ notice() }}</p> }
            <ion-button expand="block" [disabled]="busy() || code.trim().length < 6" (click)="verify()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ codeType() === 'signup' ? 'Confirm' : 'Sign in' }} }
            </ion-button>
            <div class="links">
              <button type="button" class="link" (click)="go('start')">Back</button>
              <button type="button" class="link" [disabled]="busy()" (click)="resend()">Send a new code</button>
            </div>
          }

          @case ('forgot') {
            <h2 style="margin: 0">Reset your password</h2>
            <p class="muted" style="margin: 0">We'll email you a code, then you can choose a new password.</p>
            <div class="field">
              <label for="reset-email">Email</label>
              <ion-input id="reset-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" [(ngModel)]="email" (keyup.enter)="sendReset()"></ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <ion-button expand="block" [disabled]="busy() || !email.trim()" (click)="sendReset()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Email me a code }
            </ion-button>
            <button type="button" class="link" style="align-self: flex-start" (click)="go('start')">Back to sign in</button>
          }

          @case ('reset') {
            <h2 style="margin: 0">Choose a new password</h2>
            <p class="muted" style="margin: 0">Enter the code we sent to <strong>{{ email }}</strong> and your new password.</p>
            <div class="field">
              <label for="reset-code">Code</label>
              <ion-input id="reset-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" [(ngModel)]="code"></ion-input>
            </div>
            <div class="field">
              <label for="new-password">New password</label>
              <ion-input id="new-password" type="password" autocomplete="new-password" placeholder="At least 8 characters" [(ngModel)]="password" (keyup.enter)="reset()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            <div class="field">
              <label for="confirm-new-password">Confirm new password</label>
              <ion-input id="confirm-new-password" type="password" autocomplete="new-password" [(ngModel)]="confirm" (keyup.enter)="reset()">
                <ion-input-password-toggle slot="end" color="medium"></ion-input-password-toggle>
              </ion-input>
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            @if (notice()) { <p class="muted" role="status" style="margin: 0; font-size: 14px">{{ notice() }}</p> }
            <ion-button expand="block" [disabled]="busy() || code.trim().length < 6 || !password || !confirm" (click)="reset()">
              @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Save and sign in }
            </ion-button>
            <div class="links">
              <button type="button" class="link" (click)="go('forgot')">Back</button>
              <button type="button" class="link" [disabled]="busy()" (click)="sendReset()">Send a new code</button>
            </div>
          }
        }
      </div>
    </ion-content>
  `
})
export class WelcomePage {
  private sb = inject(SupabaseService);
  private socialAuth = inject(SocialAuthService);
  private router = inject(Router);

  tab = signal<Tab>('signin');
  view = signal<View>('start');
  codeType = signal<CodeType>('email');
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
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password. If you’ve only signed in with a code before, use “Forgot password?” to set one.';
    if (/token has expired|invalid/i.test(m) && this.view() !== 'start') return 'That code didn’t work. Check it, or send a new one.';
    if (/rate limit|security purposes/i.test(m)) return 'Too many emails in a short time. Wait a minute and try again.';
    return m || 'Something went wrong. Try again.';
  }

  private done() {
    this.router.navigateByUrl('/tabs', { replaceUrl: true });
  }

  /** Checks a new password before it's sent; shows what's wrong. */
  private badNewPassword(): boolean {
    if (this.password.length < MIN_PASSWORD) this.error.set(`Use at least ${MIN_PASSWORD} characters for your password.`);
    else if (this.password !== this.confirm) this.error.set('The passwords don’t match.');
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
        if (await this.attempt(() => this.sb.resendSignupCode(email))) this.showCode('signup');
      } else if (ok) this.done();
      return;
    }

    if (this.badNewPassword()) return;
    let session = false;
    const ok = await this.attempt(async () => {
      const res = await this.sb.signUp(email, this.password);
      if (res.data.user && !res.data.user.identities?.length) throw new Error('There’s already an account with this email. Sign in instead, or use “Forgot password?”.');
      session = !!res.data.session;
      return res;
    });
    if (!ok) return;
    if (session) this.done();
    else this.showCode('signup');
  }

  async sendCode() {
    if (!this.email.trim()) { this.error.set('Enter your email first.'); return; }
    if (await this.attempt(() => this.sb.signInWithEmail(this.email.trim()))) this.showCode('email');
  }

  private showCode(type: CodeType) {
    this.codeType.set(type);
    this.go('code');
  }

  async resend() {
    const email = this.email.trim();
    const ok = await this.attempt(() => this.codeType() === 'signup' ? this.sb.resendSignupCode(email) : this.sb.signInWithEmail(email));
    if (ok) this.notice.set('New code sent.');
  }

  async verify() {
    if (await this.attempt(() => this.sb.verifyEmailCode(this.email.trim(), this.code.trim(), this.codeType()))) this.done();
  }

  async sendReset() {
    if (await this.attempt(() => this.sb.sendPasswordReset(this.email.trim()))) {
      if (this.view() === 'reset') this.notice.set('New code sent.');
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
