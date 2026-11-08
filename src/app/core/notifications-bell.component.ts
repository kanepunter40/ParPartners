import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { NotificationsService } from './notifications.service';

/** Header bell with an unread dot. Host pages call NotificationsService.refreshUnread() on enter. */
@Component({
  selector: 'app-notifications-bell',
  imports: [RouterLink, IonButton, IonIcon],
  styles: [`
    ion-button { position: relative; min-width: 44px; min-height: 44px; --padding-start: 10px; --padding-end: 10px; }
    .dot { position: absolute; top: 9px; right: 9px; width: 10px; height: 10px; border-radius: 999px; background: #C97B4A; border: 2px solid #F4F1E8; }
  `],
  template: `
    <ion-button fill="clear" color="dark" routerLink="/notifications"
      [attr.aria-label]="notifications.unread() ? 'Notifications, ' + notifications.unread() + ' unread' : 'Notifications'">
      <ion-icon slot="icon-only" name="notifications-outline"></ion-icon>
      @if (notifications.unread()) { <span class="dot" aria-hidden="true"></span> }
    </ion-button>
  `
})
export class NotificationsBellComponent {
  notifications = inject(NotificationsService);

  constructor() {
    addIcons({ notificationsOutline });
  }
}
