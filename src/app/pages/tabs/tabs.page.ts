import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { PushService } from '../../core/push.service';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, homeOutline, calendar, calendarOutline, search, searchOutline, golf, golfOutline, person, personOutline } from 'ionicons/icons';

const TABS = [
  { tab: 'home', icon: 'home' },
  { tab: 'rounds', icon: 'calendar' },
  { tab: 'find', icon: 'search' },
  { tab: 'scores', icon: 'golf' },
  { tab: 'profile', icon: 'person' }
];

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  styles: [`
    /* The selected tab gets a filled icon on a pill and a bold label, not just a different colour */
    ion-tab-button ion-icon { box-sizing: content-box; padding: 3px 18px; border-radius: 999px; transition: background-color 150ms; }
    ion-tab-button.tab-selected ion-icon { background: #D6E6E0; }
    ion-tab-button.tab-selected ion-label { font-weight: 700; }
  `],
  template: `
    <ion-tabs (ionTabsDidChange)="selected.set($event.tab)">
      <ion-tab-bar slot="bottom">
        @for (b of tabs; track b.tab) {
          <ion-tab-button [tab]="b.tab">
            <ion-icon [name]="selected() === b.tab ? b.icon : b.icon + '-outline'"></ion-icon>
            <ion-label>{{ t('tabs.' + b.tab) }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `
})
export class TabsPage {
  readonly t = inject(I18nService).t;
  readonly tabs = TABS;
  selected = signal('');

  constructor() {
    addIcons({ home, homeOutline, calendar, calendarOutline, search, searchOutline, golf, golfOutline, person, personOutline });
    // Signed in and onboarded by now (route guards): set up push, asking for permission the first time
    inject(PushService).start();
  }
}
