import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-welcome',
  imports: [FormsModule, IonContent, IonButton, IonInput, IonSpinner],
  styles: [`
    .hero { background: #2E5F5A; color: #F4F1E8; padding: 96px 32px 48px; text-align: center; }
    .hero h1 { font-size: 38px; margin: 0 0 12px; }
    .hero p { margin: 0 auto; max-width: 280px; line-height: 1.5; color: #E3ECE9; }
    .sheet { background: #F4F1E8; border-radius: 28px 28px 0 0; margin-top: -24px; padding: 32px 24px; display: flex; flex-direction: column; gap: 16px; }
    ion-input { --background: #fff; --padding-start: 14px; border: 1px solid #D9D2BA; border-radius: 12px; min-height: 48px; }
  `],
  template: `
    <ion-content [fullscreen]="true">
      <div class="hero">
        <h1 aria-label="Par Partners"><span aria-hidden="true"><b style="font-weight: 700; letter-spacing: .02em;">PAR</b><span style="font-weight: 600;">tners</span></span></h1>
        <p>Find playing partners near you, or post a round and fill the last spot.</p>
      </div>
      <div class="sheet">
        @if (!sent()) {
          <label for="email"><strong>Email</strong></label>
          <ion-input id="email" type="email" inputmode="email" placeholder="you@example.com" [(ngModel)]="email" (keyup.enter)="send()"></ion-input>
          @if (error()) { <p class="muted" role="alert">{{ error() }}</p> }
          <ion-button expand="block" [disabled]="busy() || !email" (click)="send()">
            @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Email me a sign-in link }
          </ion-button>
          <p class="muted" style="font-size: 13px; text-align: center; margin: 0">New here? The same link creates your account.</p>
        } @else {
          <h2 style="margin: 0">Check your inbox</h2>
          <p class="muted" style="margin: 0">We sent a sign-in link to <strong>{{ email }}</strong>. Open it on this device.</p>
          <ion-button fill="clear" (click)="sent.set(false)">Use a different email</ion-button>
        }
      </div>
    </ion-content>
  `
})
export class WelcomePage {
  private sb = inject(SupabaseService);
  email = '';
  busy = signal(false);
  sent = signal(false);
  error = signal('');

  async send() {
    if (!this.email) return;
    this.busy.set(true);
    this.error.set('');
    const { error } = await this.sb.signInWithEmail(this.email.trim());
    this.busy.set(false);
    if (error) this.error.set(error.message);
    else this.sent.set(true);
  }
}
