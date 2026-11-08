import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { ProfileService } from '../../core/profile.service';
import { RoundsService } from '../../core/rounds.service';
import { ScorecardsService, cardStats } from '../../core/scorecards.service';
import { FriendsService } from '../../core/friends.service';
import { VIBES, genderKey, langKey } from '../../core/profile-options';
import { IllustrationComponent } from '../../core/illustration.component';
import { AvatarComponent } from '../../core/avatar.component';
import { Friend, PlayerCard, ScorecardSummary } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [AvatarComponent, RouterLink, IllustrationComponent, IonContent, IonButton, IonSpinner, IonIcon],
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
    .top { display: flex; justify-content: flex-end; margin: -8px -8px -16px 0; }
    .gear { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; color: #1F3532; }
    .gear ion-icon { font-size: 24px; }
  `],
  template: `
    <ion-content>
      <div class="page-pad page top-safe">
        <h1 class="sr-only">{{ t('tabs.profile') }}</h1>
        <div class="top"><a class="gear" routerLink="/settings" [attr.aria-label]="t('settings.title')"><ion-icon name="settings-outline" aria-hidden="true"></ion-icon></a></div>
        @if (card(); as c) {
          <div class="section">
            <span class="label">{{ t('profile.othersSee') }}</span>
            <div class="card">
              <div class="who">
                <app-avatar [name]="c.display_name" [path]="c.avatar_url" [size]="56" />
                <span style="display: flex; flex-direction: column; gap: 2px">
                  <strong style="font-size: 20px">{{ c.display_name }}</strong>
                  <span class="muted">{{ c.handicap_index !== null ? t('profile.handicap', { hcp: c.handicap_index }) : t('profile.noHandicap') }}</span>
                </span>
              </div>
              <dl class="facts">
                <dt>{{ t('profile.homeCourse') }}</dt><dd>{{ homeCourse() || t('profile.none') }}</dd>
                <dt>{{ t('profile.vibe') }}</dt><dd>{{ vibeLabel(c.vibe) }}</dd>
                <dt>{{ t('profile.languages') }}</dt><dd>{{ languages(c) || t('profile.none') }}</dd>
                @if (c.age !== null || c.gender) {
                  <dt>{{ t('profile.about') }}</dt><dd>{{ about(c) }}</dd>
                }
              </dl>
              @if (c.age === null && !c.gender) {
                <span class="muted" style="font-size: 13px">{{ t('profile.ageHidden') }}</span>
              }
            </div>
            <ion-button fill="outline" expand="block" routerLink="/profile/edit">{{ t('profile.edit') }}</ion-button>
          </div>

          <a class="card friends-link" routerLink="/friends">
            <span style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ t('home.friends') }}</strong>
              <span class="muted" style="font-size: 13px">{{ friendsSummary() }}</span>
            </span>
            <span aria-hidden="true" style="font-size: 22px; color: #5F5B4E">&#8250;</span>
          </a>

          <div class="section">
            <span class="label">{{ t('profile.yourGolf') }}</span>
            @if (stats().rounds18) {
              <div class="stats">
                <div class="stat"><span class="muted" style="font-size: 13px">{{ t('scores.rounds18') }}</span><strong>{{ stats().rounds18 }}</strong></div>
                <div class="stat"><span class="muted" style="font-size: 13px">{{ t('scores.average') }}</span><strong>{{ stats().average }}</strong></div>
                <div class="stat"><span class="muted" style="font-size: 13px">{{ t('scores.best') }}</span><strong>{{ stats().best }}</strong></div>
              </div>
              <span class="muted" style="font-size: 13px">{{ t('profile.cardsTotal', { count: cards().length }) }}</span>
            } @else {
              <div class="card empty">
                <app-illustration scene="scorecard" style="width: 200px" />
                <strong style="font-size: 17px">{{ cards().length ? t('profile.finish18') : t('profile.statsStart') }}</strong>
                <span class="muted" style="font-size: 14px">
                  {{ cards().length ? t('profile.soFar', { count: cards().length }) : t('profile.keepScore') }}
                </span>
              </div>
            }
          </div>
        } @else if (!error()) {
          <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
        }

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

      </div>
    </ion-content>
  `
})
export class ProfilePage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private profiles = inject(ProfileService);
  private rounds = inject(RoundsService);
  private scorecards = inject(ScorecardsService);
  private friends = inject(FriendsService);

  card = signal<PlayerCard | null>(null);
  homeCourse = signal<string | null>(null);
  cards = signal<ScorecardSummary[]>([]);
  stats = computed(() => cardStats(this.cards()));
  friendList = signal<Friend[]>([]);
  friendsSummary = computed(() => {
    const n = this.friendList().filter((f) => f.status === 'friends').length;
    const asks = this.friendList().filter((f) => f.status === 'incoming').length;
    const base = n ? this.t('profile.friendCount', { count: n }) : this.t('profile.addFriends');
    return asks ? `${base} · ${this.t('profile.newRequests', { count: asks })}` : base;
  });
  error = signal('');

  constructor() {
    addIcons({ settingsOutline });
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
      this.error.set(this.i18n.error(e, 'profile.loadError'));
    }
  }

  vibeLabel(v: PlayerCard['vibe']) {
    const key = VIBES.find((x) => x[0] === v)?.[1];
    return key ? this.t(key) : '';
  }

  about(c: PlayerCard) {
    return [c.age !== null ? `${c.age}` : null, c.gender ? this.t(genderKey(c.gender)) : null].filter(Boolean).join(' · ');
  }

  languages(c: PlayerCard) {
    return c.languages.map((l) => this.t(langKey(l))).join(', ');
  }

}
