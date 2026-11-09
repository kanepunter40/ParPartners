import { Component, inject, input, output } from '@angular/core';
import { ActionSheetController, AlertController, ToastController, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal } from 'ionicons/icons';
import { I18nService } from './i18n.service';
import { REPORT_REASONS, ReportReason, SafetyService } from './safety.service';

/**
 * The "…" button next to another player: report or block them.
 * Emits `blocked` after a block so the page can reload (they may have just left the list).
 */
@Component({
  selector: 'app-player-menu',
  imports: [IonIcon],
  styles: [`
    button { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; flex: none;
      border: 0; border-radius: 999px; background: none; color: #5F5B4E; padding: 0; }
    button:active { background: #EFEAD9; }
    ion-icon { font-size: 20px; }
  `],
  template: `
    <button type="button" (click)="open()" [attr.aria-label]="t('safety.optionsFor', { name: name() })">
      <ion-icon name="ellipsis-horizontal" aria-hidden="true"></ion-icon>
    </button>
  `
})
export class PlayerMenuComponent {
  private i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private safety = inject(SafetyService);
  private sheets = inject(ActionSheetController);
  private alerts = inject(AlertController);
  private toasts = inject(ToastController);

  playerId = input.required<string>();
  name = input.required<string>();
  /** The round they were reported from, if any. */
  roundId = input<string | null>(null);
  blocked = output<void>();

  constructor() {
    addIcons({ ellipsisHorizontal });
  }

  async open() {
    const sheet = await this.sheets.create({
      header: this.name(),
      buttons: [
        { text: this.t('safety.report'), data: 'report' },
        { text: this.t('safety.block'), role: 'destructive', data: 'block' },
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
    const { data } = await sheet.onDidDismiss();
    if (data === 'report') await this.report();
    if (data === 'block') await this.confirmBlock();
  }

  private async report() {
    const sheet = await this.sheets.create({
      header: this.t('safety.whyReport', { name: this.name() }),
      buttons: [
        ...REPORT_REASONS.map((r) => ({ text: this.t(`safety.reason.${r}`), data: r })),
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
    const reason = (await sheet.onDidDismiss()).data as ReportReason | undefined;
    if (!reason) return;

    const details = await this.alerts.create({
      header: this.t('safety.reportTitle', { name: this.name() }),
      message: this.t('safety.reportDetails'),
      inputs: [{ name: 'details', type: 'textarea', placeholder: this.t('safety.detailsPlaceholder'), attributes: { maxlength: 1000 } }],
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('safety.send'), role: 'confirm' }
      ]
    });
    await details.present();
    const res = await details.onDidDismiss();
    if (res.role !== 'confirm') return;

    try {
      await this.safety.report(this.playerId(), reason, res.data?.values?.details ?? '', this.roundId());
    } catch (e) {
      return this.toast(this.i18n.error(e, 'safety.reportError'));
    }

    const thanks = await this.alerts.create({
      header: this.t('safety.thanks'),
      message: this.t('safety.thanksText', { name: this.name() }),
      buttons: [
        { text: this.t('safety.notNow'), role: 'cancel' },
        { text: this.t('safety.block'), role: 'destructive' }
      ]
    });
    await thanks.present();
    if ((await thanks.onDidDismiss()).role === 'destructive') await this.doBlock();
  }

  private async confirmBlock() {
    const a = await this.alerts.create({
      header: this.t('safety.blockTitle', { name: this.name() }),
      message: this.t('safety.blockText'),
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('safety.block'), role: 'destructive' }
      ]
    });
    await a.present();
    if ((await a.onDidDismiss()).role === 'destructive') await this.doBlock();
  }

  private async doBlock() {
    try {
      await this.safety.block(this.playerId());
      await this.toast(this.t('safety.blocked', { name: this.name() }));
      this.blocked.emit();
    } catch (e) {
      await this.toast(this.i18n.error(e, 'safety.blockError'));
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}
