import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/angular/standalone';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { Profile } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButton],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Profile</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start">
        @if (profile(); as p) {
          <h2 style="margin: 0">{{ p.display_name }}</h2>
          <div class="muted">{{ p.no_handicap ? 'No handicap yet' : p.handicap_index !== null ? 'Handicap ' + p.handicap_index : '' }}</div>
          <div class="muted">{{ p.languages.join(', ') }}</div>
        }
        <p class="muted" style="font-size: 13px">Editing the profile, privacy settings and notifications come next.</p>
        <ion-button fill="outline" color="medium" (click)="signOut()">Log out</ion-button>
      </div>
    </ion-content>
  `
})
export class ProfilePage {
  private profiles = inject(ProfileService);
  private sb = inject(SupabaseService);
  private router = inject(Router);
  profile = signal<Profile | null>(null);

  async ionViewWillEnter() {
    this.profile.set(await this.profiles.load(true));
  }

  async signOut() {
    await this.sb.signOut();
    this.profiles.clear();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
