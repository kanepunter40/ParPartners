import { Component, inject, signal, computed } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSearchbar, IonSpinner } from '@ionic/angular/standalone';
import { FriendsService } from '../../core/friends.service';
import { AvatarComponent } from '../../core/avatar.component';
import { PlayerMenuComponent } from '../../core/player-menu.component';
import { Friend, FriendStatus } from '../../core/models';

@Component({
  selector: 'app-friends',
  imports: [AvatarComponent, PlayerMenuComponent, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSearchbar, IonSpinner],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 24px; }
    .label { font-size: 12px; font-weight: 600; color: #2E5F5A; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; display: block; }
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 8px 12px 8px 16px; border-bottom: 1px solid #EFEAD9; }
    .row:last-child { border-bottom: 0; }
    .name { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .actions { display: flex; gap: 4px; flex: none; }
    ion-searchbar { padding: 0; --background: #fff; }
    ion-button { min-height: 40px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('home.friends') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad wrap">
        <section>
          <ion-searchbar [placeholder]="t('friends.search')" [debounce]="300" (ionInput)="search($event)"></ion-searchbar>
          @if (query().length >= 2) {
            <div class="card" style="margin-top: 10px">
              @for (p of results(); track p.id) {
                <div class="row">
                  <app-avatar [name]="p.display_name" [path]="p.avatar_url" [size]="36" />
                  <span class="name"><strong>{{ p.display_name }}</strong>
                    @if (p.handicap_index !== null) { <span class="muted" style="font-size: 13px">{{ t('common.hcp', { hcp: p.handicap_index }) }}</span> }</span>
                  <span class="actions">
                    @switch (statusOf(p.id)) {
                      @case ('friends') { <span class="muted" style="font-size: 13px; padding-right: 8px">{{ t('friends.isFriend') }}</span> }
                      @case ('requested') { <span class="muted" style="font-size: 13px; padding-right: 8px">{{ t('friends.requested') }}</span> }
                      @case ('incoming') { <ion-button size="small" [disabled]="busy() === p.id" (click)="respond(p.id, true)">{{ t('friends.accept') }}</ion-button> }
                      @default { <ion-button size="small" fill="outline" [disabled]="busy() === p.id" (click)="add(p.id)">{{ t('friends.add') }}</ion-button> }
                    }
                    <app-player-menu [playerId]="p.id" [name]="p.display_name" (blocked)="afterBlock(p.id)" />
                  </span>
                </div>
              } @empty {
                <p class="muted" style="margin: 0; padding: 16px">{{ searching() ? t('find.searching') : t('friends.noMatch', { query: query() }) }}</p>
              }
            </div>
          }
        </section>

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        @if (incoming().length) {
          <section>
            <span class="label">{{ t('friends.requests') }}</span>
            <div class="card">
              @for (f of incoming(); track f.id) {
                <div class="row">
                  <app-avatar [name]="f.display_name" [path]="f.avatar_url" [size]="36" />
                  <span class="name"><strong>{{ f.display_name }}</strong></span>
                  <span class="actions">
                    <ion-button size="small" fill="clear" color="medium" [disabled]="busy() === f.id" (click)="respond(f.id, false)">{{ t('friends.decline') }}</ion-button>
                    <ion-button size="small" [disabled]="busy() === f.id" (click)="respond(f.id, true)">{{ t('friends.accept') }}</ion-button>
                    <app-player-menu [playerId]="f.id" [name]="f.display_name" (blocked)="afterBlock(f.id)" />
                  </span>
                </div>
              }
            </div>
          </section>
        }

        @if (loaded()) {
          <section>
            <span class="label">{{ t('friends.yours') }}{{ friends().length ? ' (' + friends().length + ')' : '' }}</span>
            @if (friends().length) {
              <div class="card">
                @for (f of friends(); track f.id) {
                  <div class="row">
                    <app-avatar [name]="f.display_name" [path]="f.avatar_url" [size]="36" />
                    <span class="name"><strong>{{ f.display_name }}</strong>
                      @if (f.handicap_index !== null) { <span class="muted" style="font-size: 13px">{{ t('common.hcp', { hcp: f.handicap_index }) }}</span> }</span>
                    <ion-button size="small" fill="clear" color="medium" [disabled]="busy() === f.id" (click)="remove(f)">
                      {{ confirmRemove() === f.id ? t('friends.tapConfirm') : t('friends.remove') }}
                    </ion-button>
                    <app-player-menu [playerId]="f.id" [name]="f.display_name" (blocked)="afterBlock(f.id)" />
                  </div>
                }
              </div>
            } @else {
              <p class="muted" style="margin: 0">{{ t('friends.empty') }}</p>
            }
          </section>

          @if (sent().length) {
            <section>
              <span class="label">{{ t('friends.sent') }}</span>
              <div class="card">
                @for (f of sent(); track f.id) {
                  <div class="row">
                    <app-avatar [name]="f.display_name" [path]="f.avatar_url" [size]="36" />
                    <span class="name"><strong>{{ f.display_name }}</strong><span class="muted" style="font-size: 13px">{{ t('friends.waiting') }}</span></span>
                    <ion-button size="small" fill="clear" color="medium" [disabled]="busy() === f.id" (click)="cancel(f.id)">{{ t('common.cancel') }}</ion-button>
                  </div>
                }
              </div>
            </section>
          }
        } @else {
          <div style="display: flex; justify-content: center; padding: 48px"><ion-spinner></ion-spinner></div>
        }
      </div>
    </ion-content>
  `
})
export class FriendsPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private friendsService = inject(FriendsService);

  list = signal<Friend[]>([]);
  friends = computed(() => this.list().filter((f) => f.status === 'friends'));
  incoming = computed(() => this.list().filter((f) => f.status === 'incoming'));
  sent = computed(() => this.list().filter((f) => f.status === 'requested'));
  query = signal('');
  results = signal<{ id: string; display_name: string; avatar_url: string | null; handicap_index: number | null }[]>([]);
  searching = signal(false);
  loaded = signal(false);
  busy = signal<string | null>(null);
  confirmRemove = signal<string | null>(null);
  error = signal('');


  ionViewWillEnter() {
    this.load();
  }

  async load() {
    try {
      this.list.set(await this.friendsService.list());
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'friends.loadError'));
    } finally {
      this.loaded.set(true);
    }
  }

  statusOf(id: string): FriendStatus {
    return this.list().find((f) => f.id === id)?.status ?? 'none';
  }

  async search(ev: Event) {
    const q = ((ev as CustomEvent).detail?.value ?? '').trim();
    this.query.set(q);
    if (q.length < 2) { this.results.set([]); return; }
    this.searching.set(true);
    try {
      this.results.set(await this.friendsService.search(q));
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'friends.searchError'));
    } finally {
      this.searching.set(false);
    }
  }

  private async run(id: string, fn: () => Promise<unknown>) {
    this.busy.set(id);
    this.error.set('');
    try {
      await fn();
      await this.load();
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'common.error'));
    } finally {
      this.busy.set(null);
    }
  }

  /** A blocked player drops out of the lists and the search results. */
  afterBlock(id: string) {
    this.results.update((r) => r.filter((p) => p.id !== id));
    return this.load();
  }

  add(id: string) { return this.run(id, () => this.friendsService.add(id)); }
  respond(id: string, accept: boolean) { return this.run(id, () => this.friendsService.respond(id, accept)); }
  cancel(id: string) { return this.run(id, () => this.friendsService.remove(id)); }

  /** Takes a second tap within 4 seconds. */
  remove(f: Friend) {
    if (this.confirmRemove() !== f.id) {
      this.confirmRemove.set(f.id);
      setTimeout(() => this.confirmRemove.update((id) => (id === f.id ? null : id)), 4000);
      return;
    }
    this.confirmRemove.set(null);
    return this.run(f.id, () => this.friendsService.remove(f.id));
  }
}
