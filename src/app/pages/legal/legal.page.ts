import { Component, computed, input, inject } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { IMPRINT, PRIVACY, TERMS } from './legal-texts';
import { IMPRINT_DE, PRIVACY_DE, TERMS_DE } from './legal-texts.de';

/** /legal/privacy, /legal/terms and /legal/imprint. Open without signing in (linked from sign-up). */
@Component({
  selector: 'app-legal',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  styles: [`
    .doc { display: flex; flex-direction: column; gap: 20px; max-width: 640px; }
    h2 { font-size: 18px; margin: 0 0 6px; }
    p { margin: 0 0 10px; line-height: 1.55; }
    .updated { font-size: 13px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/settings" [text]="t('common.back')"></ion-back-button></ion-buttons>
        <ion-title>{{ text().title }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <article class="page-pad doc">
        <div>
          @if (text().intro) { <p>{{ text().intro }}</p> }
          <span class="muted updated">{{ t('legal.updated', { date: text().updated }) }}</span>
        </div>
        @for (s of text().sections; track s.heading) {
          <section>
            <h2>{{ s.heading }}</h2>
            @for (b of s.body; track $index) { <p>{{ b }}</p> }
          </section>
        }
      </article>
    </ion-content>
  `
})
export class LegalPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  /** Route param: 'privacy', 'terms' or 'imprint'. */
  doc = input<string>('privacy');
  text = computed(() => {
    const de = this.i18n.lang() === 'de';
    switch (this.doc()) {
      case 'terms': return de ? TERMS_DE : TERMS;
      case 'imprint': return de ? IMPRINT_DE : IMPRINT;
      default: return de ? PRIVACY_DE : PRIVACY;
    }
  });
}
