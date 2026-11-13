import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { NotificationsService } from '../../core/notifications.service';
import { NotificationsBellComponent } from '../../core/notifications-bell.component';
import { MyRound } from '../../core/models';

@Component({
  selector: 'app-rounds',
  imports: [RouterLink, NotificationsBellComponent, IonContent, IonHeader, IonToolbar, IonButtons, IonRefresher, IonRefresherContent, IonButton],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="end"><app-notifications-bell /></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad">
        <h1 style="font-size: 38px; margin: 0 2px 18px">{{ t('rounds.title') }}</h1>
        <!-- At the top, so it doesn't end up below a long list of rounds -->
        @if (items().length) {
          <ion-button fill="outline" expand="block" routerLink="/create" style="margin: 0">{{ t('rounds.post') }}</ion-button>
        }
        <ion-button fill="clear" expand="block" routerLink="/free" style="margin: 4px 0 16px">{{ t('free.cta') }}</ion-button>
        @if (items().length) {
          <div class="pp-group">
            @for (r of items(); track r.round_id) {
              <a class="group-row" [routerLink]="['/round', r.round_id]">
                <span class="txt">
                  <span>{{ r.course_name }}</span>
                  <small>{{ i18n.date(r.tee_time) }} · {{ r.status === 'host' ? t('rounds.hostedByYou') : t('home.hostedBy', { name: r.host_name }) }}</small>
                  @switch (r.status) {
                    @case ('host') { <span class="pill ok" style="margin-top: 2px">{{ t('home.youHost') }}</span> }
                    @case ('waitlisted') { <span class="pill full" style="margin-top: 2px">{{ t('rounds.waitlisted') }}</span> }
                    @case ('invited') { <span class="pill" style="margin-top: 2px">{{ t('rounds.invited') }}</span> }
                    @default { <span class="pill ok" style="margin-top: 2px">{{ t('rounds.youreIn') }}</span> }
                  }
                </span>
                <span class="val" style="font-size: 14px">{{ t('home.inCount', { n: r.confirmed, max: r.max_players }) }}</span>
              </a>
            }
          </div>
        }
        @if (!items().length) {
          @if (loaded()) {
            <div style="padding: 24px 2px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start">
              <h2 style="margin: 0; font-size: 24px">{{ t('rounds.emptyTitle') }}</h2>
              <p class="muted" style="margin: 0">{{ t('rounds.emptyText') }}</p>
              <ion-button routerLink="/create">{{ t('rounds.post') }}</ion-button>
            </div>
          }
        }
      </div>
    </ion-content>
  `
})
export class RoundsPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private rounds = inject(RoundsService);
  private notifications = inject(NotificationsService);
  items = signal<MyRound[]>([]);
  loaded = signal(false);

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.notifications.refreshUnread();
    try {
      this.items.set(await this.rounds.myRounds());
    } finally {
      this.loaded.set(true);
    }
  }

  async refresh(ev: Event) {
    await this.load();
    (ev as CustomEvent).detail.complete?.() ?? (ev.target as any).complete();
  }
}
