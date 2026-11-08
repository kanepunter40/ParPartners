import { Component, computed, input, inject } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { PRIVACY, TERMS } from './legal-texts';
import { PRIVACY_DE, TERMS_DE } from './legal-texts.de';

/** /legal/privacy and /legal/terms. Open without signing in (linked from sign-up). */
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
          <p>{{ text().intro }}</p>
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
  /** Route param: 'privacy' or 'terms'. */
  doc = input<string>('privacy');
  text = computed(() => {
    const de = this.i18n.lang() === 'de';
    return this.doc() === 'terms' ? (de ? TERMS_DE : TERMS) : (de ? PRIVACY_DE : PRIVACY);
  });
}
