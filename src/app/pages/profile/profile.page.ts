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
import { AvatarComponent } from '../../core/avatar.component';
import { GolfStatsComponent } from '../../core/golf-stats.component';
import { Friend, PlayerCard, ScorecardSummary } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [AvatarComponent, GolfStatsComponent, RouterLink, IonContent, IonButton, IonSpinner, IonIcon],
  styles: [`
    .section { display: flex; flex-direction: column; gap: 10px; }
    .label { font-family: var(--pp-serif); font-size: 22px; font-weight: 400; letter-spacing: -0.02em; line-height: 1.15; color: var(--pp-ink); margin: 0 2px; }
    .who { display: flex; align-items: center; gap: 14px; margin: 0 2px; }
    .who h2 { font-family: var(--pp-serif); font-weight: 300; font-size: 34px; line-height: 1; letter-spacing: -0.03em; margin: 0 0 4px; }
    .note { color: var(--pp-ink3); font-size: 13px; margin: 0 2px; }
    .page { display: flex; flex-direction: column; gap: 26px; min-height: 100%; box-sizing: border-box; }
    .top { display: flex; justify-content: flex-end; margin: -8px -8px -20px 0; }
    .gear { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--pp-ink); }
    .gear ion-icon { font-size: 24px; }
    .chev { color: var(--pp-ink3); font-size: 22px; flex: none; }
  `],
  template: `
    <ion-content>
      <div class="page-pad page top-safe">
        <h1 class="sr-only">{{ t('tabs.profile') }}</h1>
        <div class="top"><a class="gear" routerLink="/settings" [attr.aria-label]="t('settings.title')"><ion-icon name="settings-outline" aria-hidden="true"></ion-icon></a></div>
        @if (card(); as c) {
          <div class="who">
            <app-avatar [name]="c.display_name" [path]="c.avatar_url" [size]="64" />
            <span>
              <h2>{{ c.display_name }}</h2>
              <span class="muted">{{ c.handicap_index !== null ? t('profile.handicap', { hcp: c.handicap_index }) : t('profile.noHandicap') }}</span>
            </span>
          </div>

          <div class="section">
            <span class="label">{{ t('profile.othersSee') }}</span>
            <div class="pp-group">
              <div class="group-row"><span class="txt">{{ t('profile.homeCourse') }}</span><span class="val" style="flex: 0 1 auto">{{ homeCourse() || t('profile.none') }}</span></div>
              <div class="group-row"><span class="txt">{{ t('profile.vibe') }}</span><span class="val">{{ vibeLabel(c.vibe) }}</span></div>
              <div class="group-row"><span class="txt">{{ t('profile.languages') }}</span><span class="val" style="flex: 0 1 auto">{{ languages(c) || t('profile.none') }}</span></div>
              @if (c.age !== null || c.gender) {
                <div class="group-row"><span class="txt">{{ t('profile.about') }}</span><span class="val">{{ about(c) }}</span></div>
              }
            </div>
            @if (c.age === null && !c.gender) {
              <p class="note">{{ t('profile.ageHidden') }}</p>
            }
            <ion-button fill="outline" expand="block" routerLink="/profile/edit">{{ t('profile.edit') }}</ion-button>
          </div>

          <a class="pp-group" routerLink="/friends" style="display: block; text-decoration: none; color: inherit">
            <span class="group-row">
              <span class="txt"><span>{{ t('home.friends') }}</span><small>{{ friendsSummary() }}</small></span>
              <span class="chev" aria-hidden="true">&#8250;</span>
            </span>
          </a>

          <div class="section">
            <span class="label">{{ t('profile.yourGolf') }}</span>
            @if (stats().rounds18) {
              <app-golf-stats [stats]="stats()" />
              <p class="note">{{ t('profile.cardsTotal', { count: cards().length }) }}</p>
            } @else {
              <div class="pp-group">
                <div class="group-row">
                  <span class="txt">
                    <span>{{ cards().length ? t('profile.finish18') : t('profile.statsStart') }}</span>
                    <small>{{ cards().length ? t('profile.soFar', { count: cards().length }) : t('profile.keepScore') }}</small>
                  </span>
                </div>
              </div>
            }
          </div>
        } @else if (!error()) {
          <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
        }

        @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }

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
