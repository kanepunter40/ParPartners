import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SocialAuthService } from './core/social-auth.service';
import { AppLinksService } from './core/app-links';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`
})
export class App {
  constructor() {
    inject(SocialAuthService).listenForCallback();
    inject(AppLinksService).listen();
  }
}
