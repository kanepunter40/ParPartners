import { Injectable, inject } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { I18nService } from './i18n.service';
import { REPORT_REASONS, ReportReason, SafetyService } from './safety.service';

export interface PlayerActionTarget {
  playerId: string;
  name: string;
  /** The round they were reported from, if any. */
  roundId?: string | null;
  /** A chat message the report is about: its text goes into the report so it can be reviewed. */
  message?: string | null;
}

/** Room left in reports.details (1000 characters) for the player's own words. */
const QUOTE_MAX = 400;

/**
 * Report or block another player: the action sheet behind the "…" button and behind tapping
 * a message in round chat. Resolves true if the player was blocked, so the page can reload.
 */
@Injectable({ providedIn: 'root' })
export class PlayerActionsService {
  private i18n = inject(I18nService);
  private t = this.i18n.t;
  private safety = inject(SafetyService);
  private sheets = inject(ActionSheetController);
  private alerts = inject(AlertController);
  private toasts = inject(ToastController);

  async open(target: PlayerActionTarget): Promise<boolean> {
    const sheet = await this.sheets.create({
      header: target.name,
      subHeader: target.message ? quote(target.message, 120) : undefined,
      buttons: [
        { text: this.t(target.message ? 'safety.reportMessage' : 'safety.report'), data: 'report' },
        { text: this.t('safety.block'), role: 'destructive', data: 'block' },
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
    const { data } = await sheet.onDidDismiss();
    if (data === 'report') return this.report(target);
    if (data === 'block') return this.confirmBlock(target);
    return false;
  }

  private async report(target: PlayerActionTarget): Promise<boolean> {
    const sheet = await this.sheets.create({
      header: this.t('safety.whyReport', { name: target.name }),
      buttons: [
        ...REPORT_REASONS.map((r) => ({ text: this.t(`safety.reason.${r}`), data: r })),
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
    const reason = (await sheet.onDidDismiss()).data as ReportReason | undefined;
    if (!reason) return false;

    const quoted = target.message ? quote(target.message, QUOTE_MAX) : '';
    const details = await this.alerts.create({
      header: this.t('safety.reportTitle', { name: target.name }),
      message: this.t('safety.reportDetails', { name: target.name }),
      inputs: [{ name: 'details', type: 'textarea', placeholder: this.t('safety.detailsPlaceholder'),
                 attributes: { maxlength: 1000 - (quoted ? quoted.length + 20 : 0) } }],
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('safety.send'), role: 'confirm' }
      ]
    });
    await details.present();
    const res = await details.onDidDismiss();
    if (res.role !== 'confirm') return false;

    const own = (res.data?.values?.details ?? '').trim();
    const text = quoted ? `Chat message: ${quoted}${own ? '\n\n' + own : ''}` : own;
    try {
      await this.safety.report(target.playerId, reason, text.slice(0, 1000), target.roundId ?? null);
    } catch (e) {
      await this.toast(this.i18n.error(e, 'safety.reportError'));
      return false;
    }

    const thanks = await this.alerts.create({
      header: this.t('safety.thanks'),
      message: this.t('safety.thanksText', { name: target.name }),
      buttons: [
        { text: this.t('safety.notNow'), role: 'cancel' },
        { text: this.t('safety.block'), role: 'destructive' }
      ]
    });
    await thanks.present();
    if ((await thanks.onDidDismiss()).role === 'destructive') return this.doBlock(target);
    return false;
  }

  private async confirmBlock(target: PlayerActionTarget): Promise<boolean> {
    const a = await this.alerts.create({
      header: this.t('safety.blockTitle', { name: target.name }),
      message: this.t('safety.blockText'),
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('safety.block'), role: 'destructive' }
      ]
    });
    await a.present();
    if ((await a.onDidDismiss()).role === 'destructive') return this.doBlock(target);
    return false;
  }

  private async doBlock(target: PlayerActionTarget): Promise<boolean> {
    try {
      await this.safety.block(target.playerId);
      await this.toast(this.t('safety.blocked', { name: target.name }));
      return true;
    } catch (e) {
      await this.toast(this.i18n.error(e, 'safety.blockError'));
      return false;
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}

function quote(text: string, max: number) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return `“${flat.length > max ? flat.slice(0, max - 1) + '…' : flat}”`;
}
