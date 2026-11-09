import { Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { I18nService } from '../../core/i18n.service';
import { AvatarComponent } from '../../core/avatar.component';
import { BlockedPlayer, SafetyService } from '../../core/safety.service';

/** Settings > Blocked players: who I blocked, with Unblock. */
@Component({
  selector: 'app-blocked',
  imports: [AvatarComponent, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonSpinner],
  styles: [`
    .card { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 8px 12px 8px 16px; border-bottom: 1px solid #EFEAD9; }
    .row:last-child { border-bottom: 0; }
    .name { flex: 1; min-width: 0; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/settings" [text]="t('common.back')"></ion-back-button></ion-buttons>
        <ion-title>{{ t('safety.blockedTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 16px">
        <p class="muted" style="margin: 0">{{ t('safety.blockedIntro') }}</p>
        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }
        @if (loaded()) {
          @if (list().length) {
            <div class="card">
              @for (p of list(); track p.id) {
                <div class="row">
                  <app-avatar [name]="p.display_name" [path]="p.avatar_url" [size]="36" />
                  <strong class="name">{{ p.display_name }}</strong>
                  <ion-button size="small" fill="outline" [disabled]="busy() === p.id" (click)="unblock(p)"
                              [attr.aria-label]="t('safety.unblockName', { name: p.display_name })">{{ t('safety.unblock') }}</ion-button>
                </div>
              }
            </div>
          } @else {
            <p class="muted" style="margin: 0">{{ t('safety.noneBlocked') }}</p>
          }
        } @else {
          <div style="display: flex; justify-content: center; padding: 48px"><ion-spinner></ion-spinner></div>
        }
      </div>
    </ion-content>
  `
})
export class BlockedPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private safety = inject(SafetyService);

  list = signal<BlockedPlayer[]>([]);
  loaded = signal(false);
  busy = signal<string | null>(null);
  error = signal('');

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    try {
      this.list.set(await this.safety.blocked());
    } catch (e) {
      this.error.set(this.i18n.error(e, 'common.error'));
    } finally {
      this.loaded.set(true);
    }
  }

  async unblock(p: BlockedPlayer) {
    this.busy.set(p.id);
    this.error.set('');
    try {
      await this.safety.unblock(p.id);
      this.list.update((l) => l.filter((x) => x.id !== p.id));
    } catch (e) {
      this.error.set(this.i18n.error(e, 'common.error'));
    } finally {
      this.busy.set(null);
    }
  }
}
