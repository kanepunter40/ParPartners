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
        <h1 class="sr-only">{{ t('rounds.title') }}</h1>
        <!-- At the top, so it doesn't end up below a long list of rounds -->
        @if (items().length) {
          <ion-button fill="outline" expand="block" routerLink="/create" style="margin: 0 0 16px">{{ t('rounds.post') }}</ion-button>
        }
        @for (r of items(); track r.round_id) {
          <a [routerLink]="['/round', r.round_id]" style="text-decoration: none; color: inherit; display: block">
            <div style="background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px">
              <div style="display: flex; justify-content: space-between; align-items: center">
                @switch (r.status) {
                  @case ('host') { <span class="pill ok">{{ t('home.youHost') }}</span> }
                  @case ('waitlisted') { <span class="pill full">{{ t('rounds.waitlisted') }}</span> }
                  @case ('invited') { <span class="pill" style="background: #F3E4D6; color: #7A4220">{{ t('rounds.invited') }}</span> }
                  @default { <span class="pill ok">{{ t('rounds.youreIn') }}</span> }
                }
                <span style="font-size: 13px; font-weight: 600">{{ t('home.inCount', { n: r.confirmed, max: r.max_players }) }}</span>
              </div>
              <h3 style="margin: 0; font-size: 18px">{{ r.course_name }}</h3>
              <div style="display: flex; justify-content: space-between">
                <strong style="font-size: 14px">{{ i18n.date(r.tee_time) }}</strong>
                <span class="muted" style="font-size: 13px">{{ r.status === 'host' ? t('rounds.hostedByYou') : t('home.hostedBy', { name: r.host_name }) }}</span>
              </div>
            </div>
          </a>
        } @empty {
          @if (loaded()) {
            <div style="text-align: center; padding: 64px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
              <h2 style="margin: 0">{{ t('rounds.emptyTitle') }}</h2>
              <p class="muted" style="margin: 0">{{ t('rounds.emptyText') }}</p>
              <ion-button routerLink="/create">{{ t('rounds.post') }}</ion-button>
            </div>
          }
        }
        <ion-button fill="clear" expand="block" routerLink="/free" style="margin-top: 4px">{{ t('free.cta') }}</ion-button>
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
