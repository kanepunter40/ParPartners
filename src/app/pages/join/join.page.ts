import { Component, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
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
          <h2 style="margin: 0">{{ t('join.cant') }}</h2>
          <p role="alert" class="muted" style="margin: 0">{{ error() }}</p>
          <ion-button routerLink="/tabs/rounds" [replaceUrl]="true">{{ t('join.myRounds') }}</ion-button>
        } @else {
          <ion-spinner></ion-spinner>
          <p class="muted" style="margin: 0">{{ t('join.joining') }}</p>
        }
      </div>
    </ion-content>
  `
})
export class JoinPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
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
        msg.includes('full') ? this.t('join.full')
        : msg.includes('started') ? this.t('join.started')
        : msg.includes('not found') ? this.t('join.invalid')
        : this.t('join.error')
      );
    }
  }
}
