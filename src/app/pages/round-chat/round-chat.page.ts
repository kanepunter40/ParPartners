import { Component, inject, input, signal, computed, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonTextarea, IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send } from 'ionicons/icons';
import { I18nService } from '../../core/i18n.service';
import { ChatService } from '../../core/chat.service';
import { RoundsService } from '../../core/rounds.service';
import { SupabaseService } from '../../core/supabase.service';
import { NotificationsService } from '../../core/notifications.service';
import { ChatMessage, RoundDetail } from '../../core/models';
import { AvatarComponent } from '../../core/avatar.component';

const MAX_LENGTH = 1000;
/** Fallback in case the live connection drops (e.g. switching between Wi-Fi and mobile data). */
const POLL_MS = 30_000;

@Component({
  selector: 'app-round-chat',
  imports: [FormsModule, AvatarComponent, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonTextarea, IonButton, IonIcon, IonSpinner],
  styles: [`
    .list { display: flex; flex-direction: column; gap: 6px; padding: 16px 16px 8px; }
    .day { align-self: center; margin: 10px 0 4px; font-size: 12px; font-weight: 600; color: #5F5B4E; }
    .row { display: flex; align-items: flex-start; gap: 8px; max-width: 86%; }
    /* My messages: on the right, my picture on the outside edge */
    .row.mine { align-self: flex-end; flex-direction: row-reverse; }
    .row.run-start { margin-top: 6px; }
    /* Same width as the picture, so later messages in a run line up under the first */
    .face { flex: none; width: 32px; }
    /* Level with the first bubble (others' runs start with a name line; mine don't) */
    .row.run-start:not(.mine) .face { margin-top: 17px; }
    .msg { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .mine .msg { align-items: flex-end; }
    .who { font-size: 12px; font-weight: 600; color: #2E5F5A; margin: 0 0 0 12px; }
    .bubble { padding: 10px 14px; border-radius: 18px; background: #fff; border: 1px solid #E6DFC9; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.35; }
    .mine .bubble { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .time { font-size: 11px; color: #5F5B4E; margin: 0 12px; }
    .compose { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px 18px; background: #F4F1E8; border-top: 1px solid #E6DFC9; }
    ion-textarea { --background: #fff; --padding-start: 14px; --padding-end: 14px; border: 1px solid #D9D2BA; border-radius: 22px; min-height: 44px; }
    .send { --border-radius: 999px; width: 48px; height: 48px; margin: 0; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/round/' + id()" text=""></ion-back-button></ion-buttons>
        <ion-title>
          {{ t('chat.title') }}
          @if (round(); as r) { <div class="muted" style="font-size: 12px; font-weight: 400">{{ r.courses.name }} · {{ i18n.date(r.tee_time) }}</div> }
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div style="display: flex; justify-content: center; padding: 64px"><ion-spinner></ion-spinner></div>
      } @else if (loadError()) {
        <p role="alert" class="page-pad" style="color: #9C5428">{{ loadError() }}</p>
      } @else {
        <div class="list" role="log" aria-live="polite" [attr.aria-label]="t('chat.title')">
          @for (m of messages(); track m.id; let i = $index) {
            @if (newDay(i)) { <div class="day">{{ i18n.date(m.created_at, 'dayDateYear') }}</div> }
            <div class="row" [class.mine]="m.sender_id === me()" [class.run-start]="newSender(i)">
              <span class="face">
                @if (newSender(i)) { <app-avatar [name]="name(m.sender_id)" [path]="avatar(m.sender_id)" [size]="32" /> }
              </span>
              <div class="msg">
                @if (m.sender_id !== me() && newSender(i)) { <span class="who">{{ name(m.sender_id) }}</span> }
                <div class="bubble">{{ m.body }}</div>
                @if (lastOfRun(i)) { <span class="time">{{ i18n.date(m.created_at, 'time') }}</span> }
              </div>
            </div>
          } @empty {
            <div style="text-align: center; padding: 48px 16px; display: flex; flex-direction: column; gap: 8px">
              <h2 style="margin: 0; font-size: 20px">{{ t('chat.emptyTitle') }}</h2>
              <p class="muted" style="margin: 0">{{ t('chat.emptyText') }}</p>
            </div>
          }
        </div>
      }
    </ion-content>

    @if (!loading() && !loadError()) {
      <ion-footer class="ion-no-border">
        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0; padding: 8px 16px 0; background: #F4F1E8; font-size: 14px">{{ error() }}</p> }
        <div class="compose">
          <ion-textarea #box [(ngModel)]="draft" [autoGrow]="true" [rows]="1" [maxlength]="maxLength" [placeholder]="t('chat.placeholder')"
                        [attr.aria-label]="t('chat.placeholder')" autocapitalize="sentences" style="flex: 1"></ion-textarea>
          <ion-button class="send" [disabled]="sending() || !draft.trim()" (click)="sendMessage()" [attr.aria-label]="t('chat.send')">
            <ion-icon slot="icon-only" name="send"></ion-icon>
          </ion-button>
        </div>
      </ion-footer>
    }
  `
})
export class RoundChatPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  /** Bound from the route parameter :id (withComponentInputBinding). */
  id = input.required<string>();

  private chat = inject(ChatService);
  private rounds = inject(RoundsService);
  private sb = inject(SupabaseService);
  private notifications = inject(NotificationsService);
  private content = viewChild(IonContent);

  readonly maxLength = MAX_LENGTH;
  round = signal<RoundDetail | null>(null);
  messages = signal<ChatMessage[]>([]);
  loading = signal(true);
  loadError = signal('');
  error = signal('');
  sending = signal(false);
  draft = '';
  me = computed(() => this.sb.session()?.user.id ?? null);
  private names = computed(() => new Map((this.round()?.round_players ?? []).map((p) => [p.player_id, p.profiles.display_name])));
  private avatars = computed(() => new Map((this.round()?.round_players ?? []).map((p) => [p.player_id, p.profiles.avatar_url])));
  private channel?: RealtimeChannel;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    addIcons({ send });
  }

  async ionViewWillEnter() {
    try {
      const [round, messages] = await Promise.all([this.rounds.getRound(this.id()), this.chat.list(this.id())]);
      this.round.set(round);
      this.messages.set(messages);
    } catch (e: any) {
      this.loadError.set(this.i18n.error(e, 'chat.loadError'));
      return;
    } finally {
      this.loading.set(false);
    }
    this.scrollDown(0);
    this.markRead();
    this.channel = this.chat.subscribe(this.id(), (m) => {
      this.add(m);
      this.markRead();
    });
    this.timer = setInterval(() => this.refresh(), POLL_MS);
  }

  ionViewWillLeave() {
    if (this.channel) this.chat.unsubscribe(this.channel);
    this.channel = undefined;
    clearInterval(this.timer);
  }

  private async refresh() {
    try {
      const latest = await this.chat.list(this.id());
      if (latest.length !== this.messages().length) {
        this.messages.set(latest);
        this.scrollDown();
      }
    } catch { /* offline: try again next time */ }
  }

  /** Adds a message once (it can arrive both from sending and from the live feed). */
  private add(m: ChatMessage) {
    if (this.messages().some((x) => x.id === m.id)) return;
    this.messages.update((list) => [...list, m].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    this.scrollDown();
  }

  private markRead() {
    this.chat.markRead(this.id()).then(() => this.notifications.refreshUnread()).catch(() => {});
  }

  private scrollDown(ms = 200) {
    setTimeout(() => this.content()?.scrollToBottom(ms), 0);
  }

  async sendMessage() {
    const body = this.draft.trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    this.error.set('');
    try {
      this.add(await this.chat.send(this.id(), body.slice(0, MAX_LENGTH)));
      this.draft = '';
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'chat.sendError'));
    } finally {
      this.sending.set(false);
    }
  }

  name(id: string | null) {
    return (id && this.names().get(id)) || this.t('notifications.aPlayer');
  }

  /** Profile picture path, or null for initials. */
  avatar(id: string | null) {
    return (id && this.avatars().get(id)) || null;
  }

  newSender(i: number) {
    const list = this.messages();
    return i === 0 || list[i - 1].sender_id !== list[i].sender_id || this.newDay(i);
  }

  lastOfRun(i: number) {
    const list = this.messages();
    const next = list[i + 1];
    return !next || next.sender_id !== list[i].sender_id
      || new Date(next.created_at).getTime() - new Date(list[i].created_at).getTime() > 5 * 60_000;
  }

  newDay(i: number) {
    const list = this.messages();
    return i === 0 || new Date(list[i - 1].created_at).toDateString() !== new Date(list[i].created_at).toDateString();
  }
}
