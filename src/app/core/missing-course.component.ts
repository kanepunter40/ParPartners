import { Component, inject, input } from '@angular/core';
import { FeedbackService } from './feedback.service';
import { I18nService } from './i18n.service';

/**
 * "Can't find your course? Tell us" under a course search that found nothing.
 * Pages show it while `query` is the search text that had no results.
 */
@Component({
  selector: 'app-missing-course',
  standalone: true,
  template: `
    <button type="button" class="missing" (click)="feedback.requestCourse(query())">
      <span>{{ t('courseFix.noCourse', { query: query() }) }}</span>
      <strong>{{ t('courseFix.tellUs') }}</strong>
    </button>
  `,
  styles: [`
    .missing { display: block; width: 100%; text-align: left; margin-top: 8px; padding: 12px 14px; font: inherit; font-size: 14px; line-height: 1.4;
      color: var(--pp-ink); background: var(--pp-surface); border: 1px dashed var(--pp-rule); border-radius: var(--pp-radius-control); }
    .missing strong { display: block; color: var(--ion-color-primary); font-weight: 600; margin-top: 2px; }
  `]
})
export class MissingCourseComponent {
  feedback = inject(FeedbackService);
  t = inject(I18nService).t;
  query = input.required<string>();
}
