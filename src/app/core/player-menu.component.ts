import { Component, inject, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal } from 'ionicons/icons';
import { I18nService } from './i18n.service';
import { PlayerActionsService } from './player-actions.service';

/**
 * The "…" button next to another player: report or block them.
 * Emits `blocked` after a block so the page can reload (they may have just left the list).
 */
@Component({
  selector: 'app-player-menu',
  imports: [IonIcon],
  styles: [`
    button { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; flex: none;
      border: 0; border-radius: 999px; background: none; color: var(--pp-ink2); padding: 0; }
    button:active { background: var(--pp-rule-soft); }
    ion-icon { font-size: 20px; }
  `],
  template: `
    <button type="button" (click)="open()" [attr.aria-label]="t('safety.optionsFor', { name: name() })">
      <ion-icon name="ellipsis-horizontal" aria-hidden="true"></ion-icon>
    </button>
  `
})
export class PlayerMenuComponent {
  readonly t = inject(I18nService).t;
  private actions = inject(PlayerActionsService);

  playerId = input.required<string>();
  name = input.required<string>();
  /** The round they were reported from, if any. */
  roundId = input<string | null>(null);
  blocked = output<void>();

  constructor() {
    addIcons({ ellipsisHorizontal });
  }

  async open() {
    if (await this.actions.open({ playerId: this.playerId(), name: this.name(), roundId: this.roundId() })) this.blocked.emit();
  }
}
