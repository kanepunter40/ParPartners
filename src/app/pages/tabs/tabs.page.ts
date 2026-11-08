import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, searchOutline, golfOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="rounds"><ion-icon name="home-outline"></ion-icon><ion-label>Rounds</ion-label></ion-tab-button>
        <ion-tab-button tab="find"><ion-icon name="search-outline"></ion-icon><ion-label>Find</ion-label></ion-tab-button>
        <ion-tab-button tab="scores"><ion-icon name="golf-outline"></ion-icon><ion-label>Scores</ion-label></ion-tab-button>
        <ion-tab-button tab="profile"><ion-icon name="person-outline"></ion-icon><ion-label>Profile</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, searchOutline, golfOutline, personOutline });
  }
}
