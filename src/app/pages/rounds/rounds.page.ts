import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { RoundsService } from '../../core/rounds.service';
import { NotificationsService } from '../../core/notifications.service';
import { NotificationsBellComponent } from '../../core/notifications-bell.component';
import { MyRound } from '../../core/models';

@Component({
  selector: 'app-rounds',
  imports: [DatePipe, RouterLink, NotificationsBellComponent, IonContent, IonHeader, IonToolbar, IonButtons, IonRefresher, IonRefresherContent, IonButton],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="end"><app-notifications-bell /></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad">
        <h1 class="sr-only">Upcoming rounds</h1>
        @for (r of items(); track r.round_id) {
          <a [routerLink]="['/round', r.round_id]" style="text-decoration: none; color: inherit; display: block">
            <div style="background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span class="pill ok">{{ r.status === 'host' ? 'You host' : "You're in" }}</span>
                <span style="font-size: 13px; font-weight: 600">{{ r.confirmed }} of {{ r.max_players }} in</span>
              </div>
              <h3 style="margin: 0; font-size: 18px">{{ r.course_name }}</h3>
              <div style="display: flex; justify-content: space-between">
                <strong style="font-size: 14px">{{ r.tee_time | date: 'EEE d MMM · HH:mm' }}</strong>
                <span class="muted" style="font-size: 13px">{{ r.status === 'host' ? 'Hosted by you' : 'Hosted by ' + r.host_name }}</span>
              </div>
            </div>
          </a>
        } @empty {
          @if (loaded()) {
            <div style="text-align: center; padding: 64px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center">
              <h2 style="margin: 0">No rounds yet</h2>
              <p class="muted" style="margin: 0">Join an open round from Find, or post your own and let other players join.</p>
              <ion-button routerLink="/create">Post a round</ion-button>
            </div>
          }
        }
        @if (items().length) {
          <ion-button fill="outline" expand="block" routerLink="/create" style="margin-top: 4px">Post a round</ion-button>
        }
      </div>
    </ion-content>
  `
})
export class RoundsPage {
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
