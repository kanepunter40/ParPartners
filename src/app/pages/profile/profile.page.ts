import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { ProfileService } from '../../core/profile.service';
import { RoundsService } from '../../core/rounds.service';
import { ScorecardsService, cardStats } from '../../core/scorecards.service';
import { SupabaseService } from '../../core/supabase.service';
import { FriendsService } from '../../core/friends.service';
import { VIBES } from '../../core/profile-options';
import { IllustrationComponent } from '../../core/illustration.component';
import { AvatarComponent } from '../../core/avatar.component';
import { Friend, PlayerCard, ScorecardSummary } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [AvatarComponent, RouterLink, IllustrationComponent, IonContent, IonButton, IonSpinner],
  styles: [`
    .section { display: flex; flex-direction: column; gap: 8px; }
    .label { font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em; }
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
    .who { display: flex; align-items: center; gap: 12px; }
    .facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; font-size: 15px; }
    .facts dt { color: #5F5B4E; }
    .facts dd { margin: 0; }
    .stats { display: flex; gap: 12px; }
    .stat { flex: 1; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 12px 14px; }
    .friends-link { flex-direction: row; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; }
    .empty { align-items: center; text-align: center; gap: 8px; padding: 20px 18px; }
    .stat strong { display: block; font-family: 'Fraunces', serif; font-size: 22px; }
    .page { display: flex; flex-direction: column; gap: 24px; min-height: 100%; box-sizing: border-box; }
    /* Pinned to the bottom of the screen when the rest is short, otherwise after the stats */
    .account { margin-top: auto; border-top: 1px solid #E6DFC9; padding-top: 20px; }
  `],
  template: `
    <ion-content>
      <div class="page-pad page top-safe">
        <h1 class="sr-only">Profile</h1>
        @if (card(); as c) {
          <div class="section">
            <span class="label">What other players see</span>
            <div class="card">
              <div class="who">
                <app-avatar [name]="c.display_name" [path]="c.avatar_url" [size]="56" />
                <span style="display: flex; flex-direction: column; gap: 2px">
                  <strong style="font-size: 20px">{{ c.display_name }}</strong>
                  <span class="muted">{{ c.handicap_index !== null ? 'Handicap ' + c.handicap_index : 'No handicap yet' }}</span>
                </span>
              </div>
              <dl class="facts">
                <dt>Home course</dt><dd>{{ homeCourse() || 'None' }}</dd>
                <dt>Vibe</dt><dd>{{ vibeLabel(c.vibe) }}</dd>
                <dt>Languages</dt><dd>{{ c.languages.join(', ') || 'None' }}</dd>
                @if (c.age !== null || c.gender) {
                  <dt>About</dt><dd>{{ about(c) }}</dd>
                }
              </dl>
              @if (c.age === null && !c.gender) {
                <span class="muted" style="font-size: 13px">Your age and gender are hidden.</span>
              }
            </div>
            <ion-button fill="outline" expand="block" routerLink="/profile/edit">Edit profile</ion-button>
          </div>

          <a class="card friends-link" routerLink="/friends">
            <span style="display: flex; flex-direction: column; gap: 2px">
              <strong>Friends</strong>
              <span class="muted" style="font-size: 13px">{{ friendsSummary() }}</span>
            </span>
            <span aria-hidden="true" style="font-size: 22px; color: #5F5B4E">&#8250;</span>
          </a>

          <div class="section">
            <span class="label">Your golf</span>
            @if (stats().rounds18) {
              <div class="stats">
                <div class="stat"><span class="muted" style="font-size: 13px">18-hole rounds</span><strong>{{ stats().rounds18 }}</strong></div>
                <div class="stat"><span class="muted" style="font-size: 13px">Average</span><strong>{{ stats().average }}</strong></div>
                <div class="stat"><span class="muted" style="font-size: 13px">Best</span><strong>{{ stats().best }}</strong></div>
              </div>
              <span class="muted" style="font-size: 13px">{{ cards().length }} {{ cards().length === 1 ? 'scorecard' : 'scorecards' }} in total</span>
            } @else {
              <div class="card empty">
                <app-illustration scene="scorecard" style="width: 200px" />
                <strong style="font-size: 17px">{{ cards().length ? 'Finish an 18-hole card to see your stats' : 'Your stats start on the first tee' }}</strong>
                <span class="muted" style="font-size: 14px">
                  {{ cards().length ? 'You have ' + cards().length + (cards().length === 1 ? ' scorecard' : ' scorecards') + ' so far. Your average and best show up after a full 18.' : 'Keep score on your next round and your average and best show up here.' }}
                </span>
              </div>
            }
          </div>
        } @else if (!error()) {
          <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
        }

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        <div class="section account">
          <span class="label">Account</span>
          <ion-button fill="outline" color="medium" expand="block" (click)="signOut()">Log out</ion-button>
          <ion-button fill="clear" expand="block" style="--color: #9C5428" [disabled]="deleting()" (click)="deleteAccount()">
            @if (deleting()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ confirmDelete() ? 'Tap again to delete for good' : 'Delete my account' }} }
          </ion-button>
          @if (confirmDelete()) {
            <p role="status" class="muted" style="margin: 0; font-size: 14px">
              This removes your profile, your solo scorecards and your notifications. Upcoming rounds you host pass to the next player who joined.
              Your scores stay on other players' cards as "Deleted player". This can't be undone.
            </p>
          }
        </div>
      </div>
    </ion-content>
  `
})
export class ProfilePage {
  private profiles = inject(ProfileService);
  private rounds = inject(RoundsService);
  private scorecards = inject(ScorecardsService);
  private sb = inject(SupabaseService);
  private friends = inject(FriendsService);
  private router = inject(Router);

  card = signal<PlayerCard | null>(null);
  homeCourse = signal<string | null>(null);
  cards = signal<ScorecardSummary[]>([]);
  stats = computed(() => cardStats(this.cards()));
  friendList = signal<Friend[]>([]);
  friendsSummary = computed(() => {
    const n = this.friendList().filter((f) => f.status === 'friends').length;
    const asks = this.friendList().filter((f) => f.status === 'incoming').length;
    const base = n ? `${n} ${n === 1 ? 'friend' : 'friends'}` : 'Add players you know';
    return asks ? `${base} · ${asks} new ${asks === 1 ? 'request' : 'requests'}` : base;
  });
  error = signal('');
  confirmDelete = signal(false);
  deleting = signal(false);

  constructor() {
    // Coming back from Edit profile doesn't fire ionViewWillEnter on this tab, so reload on changes too
    effect(() => {
      if (this.profiles.version()) untracked(() => this.load());
    });
  }

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.error.set('');
    try {
      const [card, cards, friends] = await Promise.all([this.profiles.myCard(), this.scorecards.history(), this.friends.list()]);
      this.card.set(card);
      this.cards.set(cards);
      this.friendList.set(friends);
      this.homeCourse.set(card?.home_course_id ? (await this.rounds.getCourse(card.home_course_id))?.name ?? null : null);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load your profile.');
    }
  }

  vibeLabel(v: PlayerCard['vibe']) {
    return VIBES.find((x) => x[0] === v)?.[1] ?? '';
  }

  about(c: PlayerCard) {
    return [c.age !== null ? `${c.age}` : null, c.gender].filter(Boolean).join(' · ');
  }

  async signOut() {
    await this.sb.signOut();
    this.profiles.clear();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }

  /** Takes a second tap within 4 seconds. */
  async deleteAccount() {
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      setTimeout(() => this.confirmDelete.set(false), 4000);
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    try {
      await this.profiles.deleteAccount();
      await this.sb.client.auth.signOut({ scope: 'local' }); // the user is already gone server-side
      this.profiles.clear();
      await this.router.navigateByUrl('/welcome', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not delete your account.');
    } finally {
      this.deleting.set(false);
      this.confirmDelete.set(false);
    }
  }
}
