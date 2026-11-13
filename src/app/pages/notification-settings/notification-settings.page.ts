import { Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonToggle, IonSpinner } from '@ionic/angular/standalone';
import { I18nService } from '../../core/i18n.service';
import { NOTIFICATION_GROUPS, NotificationGroup, NotificationSettingsService } from '../../core/notification-settings.service';

/** Settings > Notifications: one switch per group of push notifications. Saved on every change. */
@Component({
  selector: 'app-notification-settings',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonToggle, IonSpinner],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 16px; }
    ion-toggle { flex: none; --track-background-checked: var(--pp-deep); }
    .group-row { min-height: 64px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/settings" [text]="t('settings.title')"></ion-back-button></ion-buttons>
        <ion-title>{{ t('notifSettings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad wrap">
        <p class="muted" style="margin: 0 2px">{{ t('notifSettings.intro') }}</p>
        @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }
        @if (loaded()) {
          <div class="pp-group">
            @for (g of groups; track g) {
              <label class="group-row">
                <span class="txt">
                  <span>{{ t('notifSettings.' + g + '.title') }}</span>
                  <small>{{ t('notifSettings.' + g + '.text') }}</small>
                </span>
                <ion-toggle [checked]="!muted().includes(g)" (ionChange)="toggle(g, $event.detail.checked)"
                            [attr.aria-label]="t('notifSettings.' + g + '.title')"></ion-toggle>
              </label>
            }
          </div>
          <p class="muted" style="margin: 0 2px; font-size: 13px">{{ t('notifSettings.listNote') }}</p>
        } @else {
          <div style="display: flex; justify-content: center; padding: 48px"><ion-spinner></ion-spinner></div>
        }
      </div>
    </ion-content>
  `
})
export class NotificationSettingsPage {
  readonly t = inject(I18nService).t;
  private i18n = inject(I18nService);
  private settings = inject(NotificationSettingsService);
  readonly groups = NOTIFICATION_GROUPS;

  muted = signal<NotificationGroup[]>([]);
  loaded = signal(false);
  error = signal('');

  async ionViewWillEnter() {
    this.error.set('');
    try {
      this.muted.set(await this.settings.muted());
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'notifSettings.loadError'));
    } finally {
      this.loaded.set(true);
    }
  }

  /** Saves straight away; puts the switch back if saving fails. */
  async toggle(g: NotificationGroup, on: boolean) {
    const before = this.muted();
    const next = on ? before.filter((x) => x !== g) : [...new Set([...before, g])];
    this.muted.set(next);
    this.error.set('');
    try {
      await this.settings.save(next);
    } catch (e: any) {
      this.muted.set(before);
      this.error.set(this.i18n.error(e, 'notifSettings.saveError'));
    }
  }
}
