import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline } from 'ionicons/icons';
import { FriendsService } from '../../core/friends.service';
import { RoundsService } from '../../core/rounds.service';
import { NotificationsService } from '../../core/notifications.service';
import { NotificationsBellComponent } from '../../core/notifications-bell.component';
import { IllustrationComponent } from '../../core/illustration.component';
import { SupabaseService } from '../../core/supabase.service';
import { formatToPar, HOLES_LABEL } from '../../core/scorecards.service';
import { timeAgo } from '../../core/format';
import { AvatarComponent } from '../../core/avatar.component';
import { FeedItem, Friend, MyRound } from '../../core/models';

const PAGE = 30;

@Component({
  selector: 'app-home',
  imports: [AvatarComponent, DatePipe, RouterLink, NotificationsBellComponent, IllustrationComponent, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonRefresher, IonRefresherContent, IonSpinner],
  styles: [`
    .home { display: flex; flex-direction: column; gap: 28px; }
    .label { font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; display: block; }
    .next { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #2E5F5A; color: #fff; border-radius: 16px; padding: 16px 18px; text-decoration: none; }
    .next .when { font-family: 'Fraunces', serif; font-size: 20px; }
    .next small { color: #D5E3DF; font-size: 13px; }
    .item { display: flex; gap: 12px; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; text-decoration: none; color: inherit; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .detail { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 6px; padding-top: 10px; border-top: 1px solid #EFEAD9; font-size: 14px; }
    .score { font-family: 'Fraunces', serif; font-size: 24px; line-height: 1; }
    .head-btn { min-width: 44px; min-height: 44px; position: relative; --padding-start: 10px; --padding-end: 10px; }
    .dot { position: absolute; top: 9px; right: 9px; width: 10px; height: 10px; border-radius: 999px; background: #C97B4A; border: 2px solid #F4F1E8; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button class="head-btn" fill="clear" color="dark" routerLink="/friends"
            [attr.aria-label]="incoming() ? 'Friends, ' + incoming() + ' new requests' : 'Friends'">
            <ion-icon slot="icon-only" name="people-outline"></ion-icon>
            @if (incoming()) { <span class="dot" aria-hidden="true"></span> }
          </ion-button>
          <app-notifications-bell />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="page-pad home">
        <h1 class="sr-only">Home</h1>
        @if (next(); as r) {
          <section>
            <span class="label">Up next</span>
            <a class="next" [routerLink]="['/round', r.round_id]">
              <span style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
                <span class="when">{{ r.tee_time | date: 'EEE d MMM · HH:mm' }}</span>
                <span style="font-weight: 600">{{ r.course_name }}</span>
                <small>{{ r.confirmed }} of {{ r.max_players }} in · {{ r.status === 'host' ? 'You host' : 'Hosted by ' + r.host_name }}</small>
              </span>
              <span aria-hidden="true" style="font-size: 22px">&#8250;</span>
            </a>
          </section>
        }

        <section aria-label="Updates">
          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0 0 12px">{{ error() }}</p> }

          @for (f of items(); track $index) {
            <a class="item" [routerLink]="link(f)">
              <app-avatar [name]="f.actor_name" [path]="f.actor_avatar" [size]="40" />
              <span class="body">
                <span>{{ text(f) }}</span>
                <span class="muted" style="font-size: 12px">{{ ago(f.at) }}</span>

                @if (f.kind === 'scorecard') {
                  <span class="detail">
                    <span style="display: flex; flex-direction: column; gap: 4px">
                      <strong>{{ f.course_name }}</strong>
                      <span class="muted" style="font-size: 13px">{{ holesLabel(f) }}</span>
                      @if (f.personal_best) { <span class="pill" style="align-self: flex-start">Personal best</span> }
                    </span>
                    <span style="text-align: right">
                      <span class="score">{{ f.strokes }}</span><br>
                      <span class="muted" style="font-size: 13px">{{ toPar(f) }}</span>
                    </span>
                  </span>
                } @else if (f.kind !== 'new_friend') {
                  <span class="detail">
                    <span style="display: flex; flex-direction: column; gap: 4px">
                      <strong>{{ f.course_name }}</strong>
                      <span style="font-size: 13px">{{ f.tee_time | date: 'EEE d MMM · HH:mm' }}</span>
                    </span>
                    <span [class]="f.spots_left ? 'pill ok' : 'pill full'">{{ f.spots_left ? f.spots_left + (f.spots_left === 1 ? ' spot' : ' spots') + ' left' : 'Full' }}</span>
                  </span>
                }
              </span>
            </a>
          } @empty {
            @if (loaded() && !error()) {
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-bottom: 24px">
                <app-illustration scene="friends" style="width: 200px" />
                @if (friendCount()) {
                  <h3 style="margin: 0">All quiet for now</h3>
                  <p class="muted" style="margin: 0">When your friends post a round, join one or finish a scorecard, it shows up here.</p>
                } @else {
                  <h3 style="margin: 0">Golf is better with friends</h3>
                  <p class="muted" style="margin: 0">Add players you've met on the course to see their rounds and scores here.</p>
                  <ion-button routerLink="/friends">Find friends</ion-button>
                }
              </div>
            }
          }

          @if (hasMore()) {
            <ion-button fill="clear" expand="block" [disabled]="loadingMore()" (click)="more()">
              @if (loadingMore()) { <ion-spinner name="dots"></ion-spinner> } @else { Show older updates }
            </ion-button>
          }
        </section>
      </div>
    </ion-content>
  `
})
export class HomePage {
  private friends = inject(FriendsService);
  private rounds = inject(RoundsService);
  private notifications = inject(NotificationsService);
  private sb = inject(SupabaseService);

  items = signal<FeedItem[]>([]);
  next = signal<MyRound | null>(null);
  friendList = signal<Friend[]>([]);
  friendCount = computed(() => this.friendList().filter((f) => f.status === 'friends').length);
  incoming = computed(() => this.friendList().filter((f) => f.status === 'incoming').length);
  loaded = signal(false);
  hasMore = signal(false);
  loadingMore = signal(false);
  error = signal('');

  readonly ago = timeAgo;

  constructor() {
    addIcons({ peopleOutline });
  }

  ionViewWillEnter() {
    this.notifications.refreshUnread();
    this.load();
  }

  async load() {
    this.error.set('');
    try {
      const [feed, mine, friends] = await Promise.all([this.friends.feed(), this.rounds.myRounds(), this.friends.list()]);
      this.items.set(feed);
      this.hasMore.set(feed.length === PAGE);
      this.next.set(mine.find((r) => new Date(r.tee_time).getTime() > Date.now()) ?? null);
      this.friendList.set(friends);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load your updates.');
    } finally {
      this.loaded.set(true);
    }
  }

  async more() {
    const last = this.items().at(-1);
    if (!last) return;
    this.loadingMore.set(true);
    try {
      const older = await this.friends.feed(last.at);
      this.items.update((list) => [...list, ...older]);
      this.hasMore.set(older.length === PAGE);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load older updates.');
    } finally {
      this.loadingMore.set(false);
    }
  }

  async refresh(ev: Event) {
    await this.load();
    (ev as CustomEvent).detail.complete?.() ?? (ev.target as any).complete();
  }

  private isMe(id: string | null) {
    return id === this.sb.session()?.user.id;
  }

  private who(id: string, name: string) {
    return this.isMe(id) ? 'You' : name;
  }

  text(f: FeedItem): string {
    const who = this.who(f.actor_id, f.actor_name);
    switch (f.kind) {
      case 'scorecard': return `${who} finished a round`;
      case 'round_posted': return `${who} is hosting a round`;
      case 'round_joined': return `${who} joined a round`;
      case 'new_friend': return `${who} and ${this.who(f.other_id!, f.other_name!)} are now friends`;
    }
  }

  /** Rounds open their page. Scorecards open only my own (other players' cards are private to the card). */
  link(f: FeedItem): string[] | null {
    if (f.kind === 'scorecard') return this.isMe(f.actor_id) ? ['/scorecard', f.scorecard_id!] : null;
    if (f.round_id) return ['/round', f.round_id];
    return null;
  }

  holesLabel(f: FeedItem) {
    return f.holes ? HOLES_LABEL[f.holes] : '';
  }

  toPar(f: FeedItem) {
    return formatToPar(f.to_par ?? 0);
  }
}
