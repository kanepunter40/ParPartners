import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';

@Component({
  selector: 'app-join',
  imports: [RouterLink, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content>
      <div class="page-pad" style="text-align: center; padding-top: 96px; display: flex; flex-direction: column; gap: 12px; align-items: center">
        @if (error()) {
          <h2 style="margin: 0">Can't join this round</h2>
          <p role="alert" class="muted" style="margin: 0">{{ error() }}</p>
          <ion-button routerLink="/tabs/rounds" [replaceUrl]="true">Go to my rounds</ion-button>
        } @else {
          <ion-spinner></ion-spinner>
          <p class="muted" style="margin: 0">Joining the round…</p>
        }
      </div>
    </ion-content>
  `
})
export class JoinPage {
  /** Bound from the route parameter :code (withComponentInputBinding). */
  code = input.required<string>();

  private rounds = inject(RoundsService);
  private router = inject(Router);
  error = signal('');

  async ionViewWillEnter() {
    this.error.set('');
    try {
      const roundId = await this.rounds.joinByInvite(this.code());
      await this.router.navigate(['/round', roundId], { replaceUrl: true });
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      this.error.set(
        msg.includes('full') ? 'This round is already full.'
        : msg.includes('started') ? 'This round has already started.'
        : msg.includes('not found') ? 'This invite link is no longer valid. The round may have been cancelled.'
        : 'Something went wrong. Please try the link again.'
      );
    }
  }
}
