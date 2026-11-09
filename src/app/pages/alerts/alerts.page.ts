import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, notificationsOutline, chevronForward } from 'ionicons/icons';
import { I18nService } from '../../core/i18n.service';
import { AlertsService } from '../../core/alerts.service';
import { PushService } from '../../core/push.service';
import { SearchAlert } from '../../core/models';

/** Saved searches from Find, and a way to delete them. */
@Component({
  selector: 'app-alerts',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon],
  styles: [`
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 4px; min-height: 64px; padding-right: 6px; border-bottom: 1px solid #EFEAD9; }
    .row:last-child { border-bottom: 0; }
    .open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 10px 4px 10px 16px;
            background: none; border: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
    .open:disabled { cursor: default; }
    .open .chev { color: #8A8470; flex: none; margin-left: auto; }
    .text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/find" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('alerts.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 16px">
        <p class="muted" style="margin: 0">{{ t('alerts.intro') }}</p>
        @if (!push.available) { <p class="muted" style="margin: 0; font-size: 13px">{{ t('alerts.inAppOnly') }}</p> }
        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }
        @if (items().length) {
          <div class="card">
            @for (a of items(); track a.id) {
              <div class="row">
                <button type="button" class="open" [disabled]="!canOpen(a)" (click)="open(a)">
                  <span class="text">
                    <strong>{{ where(a) }}</strong>
                    <span class="muted" style="font-size: 13px">{{ details(a) }}</span>
                  </span>
                  @if (canOpen(a)) { <ion-icon class="chev" name="chevron-forward" aria-hidden="true"></ion-icon> }
                </button>
                <ion-button fill="clear" color="medium" [attr.aria-label]="t('alerts.delete', { name: where(a) })" (click)="remove(a)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              </div>
            }
          </div>
        } @else if (loaded()) {
          <div style="text-align: center; padding: 40px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
            <ion-icon name="notifications-outline" style="font-size: 40px; color: #2E5F5A" aria-hidden="true"></ion-icon>
            <h2 style="margin: 0">{{ t('alerts.emptyTitle') }}</h2>
            <p class="muted" style="margin: 0">{{ t('alerts.emptyText') }}</p>
            <ion-button routerLink="/tabs/find">{{ t('alerts.goFind') }}</ion-button>
          </div>
        }
      </div>
    </ion-content>
  `
})
export class AlertsPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly push = inject(PushService);
  private alerts = inject(AlertsService);
  private router = inject(Router);

  items = signal<SearchAlert[]>([]);
  loaded = signal(false);
  error = signal('');

  constructor() {
    addIcons({ trashOutline, notificationsOutline, chevronForward });
  }

  async ionViewWillEnter() {
    this.error.set('');
    try {
      this.items.set(await this.alerts.list());
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'alerts.loadError'));
    } finally {
      this.loaded.set(true);
    }
  }

  where(a: SearchAlert) {
    return a.course_name ?? (a.place_name ? this.t('find.nearName', { name: a.place_name }) : this.t('alerts.anArea'));
  }

  details(a: SearchAlert) {
    return [
      a.course_id ? this.t('alerts.atCourse') : this.t('find.within', { km: a.radius_km ?? 25 }),
      this.t('alerts.days.' + a.days),
      a.format ? this.t('format.' + a.format) : this.t('format.any')
    ].join(' · ');
  }

  /** Area searches need their centre (returned since 0025_saved_search_location.sql). */
  canOpen(a: SearchAlert) {
    return !!a.course_id || (a.lat != null && a.lng != null);
  }

  /** Opens Find with this search's filters. */
  open(a: SearchAlert) {
    this.alerts.pending = a;
    this.router.navigateByUrl('/tabs/find');
  }

  async remove(a: SearchAlert) {
    const before = this.items();
    this.items.set(before.filter((x) => x.id !== a.id));
    try {
      await this.alerts.remove(a.id);
    } catch (e: any) {
      this.items.set(before);
      this.error.set(this.i18n.error(e, 'common.error'));
    }
  }
}
