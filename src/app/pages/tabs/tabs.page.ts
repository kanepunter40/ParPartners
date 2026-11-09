import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { PushService } from '../../core/push.service';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, calendarOutline, searchOutline, golfOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home"><ion-icon name="home-outline"></ion-icon><ion-label>{{ t('tabs.home') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="rounds"><ion-icon name="calendar-outline"></ion-icon><ion-label>{{ t('tabs.rounds') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="find"><ion-icon name="search-outline"></ion-icon><ion-label>{{ t('tabs.find') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="scores"><ion-icon name="golf-outline"></ion-icon><ion-label>{{ t('tabs.scores') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="profile"><ion-icon name="person-outline"></ion-icon><ion-label>{{ t('tabs.profile') }}</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `
})
export class TabsPage {
  readonly t = inject(I18nService).t;

  constructor() {
    addIcons({ homeOutline, calendarOutline, searchOutline, golfOutline, personOutline });
    // Signed in and onboarded by now (route guards): set up push, asking for permission the first time
    inject(PushService).start();
  }
}
