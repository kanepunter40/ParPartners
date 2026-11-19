import { Injectable, inject } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular/standalone';
import { I18nService } from './i18n.service';
import { SupabaseService } from './supabase.service';
import { appInfo } from './app-info';

export type CourseProblem = 'wrong_par' | 'wrong_details' | 'closed' | 'other';
const PROBLEMS: CourseProblem[] = ['wrong_par', 'wrong_details', 'closed', 'other'];

export interface CourseRef { id: string; name: string }

/**
 * Telling us about things: problems with a course, courses that are missing, and feedback about the app.
 * Everything lands in a table the admins review and sends them an alert
 * (supabase/migrations/0035_course_reports_and_feedback.sql). Each flow resolves true once it was sent.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private sb = inject(SupabaseService);
  private i18n = inject(I18nService);
  private t = this.i18n.t;
  private sheets = inject(ActionSheetController);
  private alerts = inject(AlertController);
  private toasts = inject(ToastController);

  /**
   * "Problem with this course?": what's wrong, then the details.
   * `hole` and `par` (on the scorecard) fill in the wrong-par question.
   * Resolves the corrected par when the suggestion changed the course for everyone.
   */
  async reportCourse(course: CourseRef, hole?: number, par?: number): Promise<{ hole: number; par: number } | null> {
    const sheet = await this.sheets.create({
      header: this.t('courseFix.whatsWrong', { name: course.name }),
      buttons: [
        ...PROBLEMS.map((p) => ({ text: this.t(`courseFix.problem.${p}`), data: p })),
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
    const kind = (await sheet.onDidDismiss()).data as CourseProblem | undefined;
    if (!kind) return null;
    if (kind === 'wrong_par') return this.suggestPar(course, hole, par);

    const res = await this.ask(this.t(`courseFix.problem.${kind}`), this.t('courseFix.detailsText'), [
      { name: 'details', type: 'textarea', placeholder: this.t(`courseFix.placeholder.${kind}`), attributes: { maxlength: 1000 } }
    ]);
    if (!res) return null;
    if (await this.send(() => this.rpc('report_course', { p_course_id: course.id, p_kind: kind, p_details: res['details'] || null }))) {
      await this.toast(this.t('courseFix.thanks'));
    }
    return null;
  }

  /**
   * A par that comes from the course data is wrong: suggest the right one.
   * It changes for everyone once a second player who played the course suggests the same par.
   */
  async suggestPar(course: CourseRef, hole?: number, current?: number): Promise<{ hole: number; par: number } | null> {
    let h = hole;
    if (!h) {
      const pick = await this.ask(this.t('courseFix.whichHole'), '', [
        { name: 'hole', type: 'number', placeholder: this.t('courseFix.holeNumber'), min: 1, max: 27 }
      ]);
      h = Math.round(Number(pick?.['hole']));
      if (!pick || !(h >= 1 && h <= 27)) return null;
    }

    const alert = await this.alerts.create({
      header: this.t('courseFix.parTitle', { n: h }),
      message: this.t(current ? 'courseFix.parText' : 'courseFix.parTextNoCurrent', { par: current ?? '' }),
      inputs: [3, 4, 5, 6].map((p) => ({ type: 'radio' as const, label: this.t('card.par', { par: p }), value: p, checked: false, disabled: p === current })),
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('courseFix.send'), role: 'confirm' }
      ]
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    const par = Number(res.data?.values);
    if (res.role !== 'confirm' || !(par >= 3 && par <= 6)) return null;

    let result: string | null = null;
    const ok = await this.send(async () => {
      result = await this.rpc('report_course', { p_course_id: course.id, p_kind: 'wrong_par', p_hole: h, p_par: par });
    });
    if (!ok) return null;
    if (result === 'applied') {
      await this.toast(this.t('courseFix.parChanged', { n: h!, par }));
      return { hole: h!, par };
    }
    await this.toast(this.t('courseFix.parReceived'));
    return null;
  }

  /** "Can't find your course?": its name (from the search) and town. */
  async requestCourse(query = ''): Promise<boolean> {
    const res = await this.ask(this.t('courseFix.missingTitle'), this.t('courseFix.missingText'), [
      { name: 'name', type: 'text', value: query.trim(), placeholder: this.t('courseFix.courseName'), attributes: { maxlength: 120 } },
      { name: 'place', type: 'text', placeholder: this.t('courseFix.place'), attributes: { maxlength: 120 } },
      { name: 'details', type: 'textarea', placeholder: this.t('courseFix.missingDetails'), attributes: { maxlength: 1000 } }
    ], (v) => !!v['name']?.trim());
    if (!res) return false;
    const ok = await this.send(() => this.rpc('request_course', { p_name: res['name'], p_place: res['place'] || null, p_details: res['details'] || null }));
    if (ok) await this.toast(this.t('courseFix.missingThanks'));
    return ok;
  }

  /** Settings > Send feedback: a message, sent with the app version and phone model. */
  async sendFeedback(): Promise<boolean> {
    const res = await this.ask(this.t('feedback.title'), this.t('feedback.text'), [
      { name: 'message', type: 'textarea', placeholder: this.t('feedback.placeholder'), attributes: { maxlength: 2000, rows: 5 } }
    ], (v) => !!v['message']?.trim());
    if (!res) return false;
    const info = await appInfo();
    const ok = await this.send(() => this.rpc('send_feedback', { p_message: res['message'], p_version: info.version, p_platform: info.platform, p_device: info.device }));
    if (ok) await this.toast(this.t('feedback.thanks'));
    return ok;
  }

  // --- helpers ----------------------------------------------------------------

  /** An alert with inputs. Resolves the values, or null if cancelled. `valid` keeps it open until it's filled in. */
  private async ask(header: string, message: string, inputs: any[], valid?: (v: Record<string, string>) => boolean) {
    const alert = await this.alerts.create({
      header,
      message: message || undefined,
      inputs,
      buttons: [
        { text: this.t('common.cancel'), role: 'cancel' },
        { text: this.t('courseFix.send'), role: 'confirm', handler: (v) => (valid ? valid(v) : true) }
      ]
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    if (res.role !== 'confirm') return null;
    const values = (res.data?.values ?? {}) as Record<string, string>;
    return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v ?? '').trim()]));
  }

  private async rpc(fn: string, args: Record<string, unknown>) {
    const { data, error } = await this.sb.client.rpc(fn, args);
    if (error) throw error;
    return data as string | null;
  }

  private async send(fn: () => Promise<unknown>) {
    try {
      await fn();
      return true;
    } catch (e) {
      await this.toast(this.i18n.error(e, 'courseFix.error'));
      return false;
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3000, position: 'bottom' });
    await t.present();
  }
}
