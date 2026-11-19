import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from './i18n.service';

/** "GB" -> 🇬🇧 (the two regional indicator letters that phones draw as a flag). */
export function flagEmoji(country: string | null | undefined): string {
  const code = (country ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * The second line of a course in search results: a small flag, then the town,
 * or the country's name when there's no town. Two courses with the same name in different countries can be told apart.
 */
@Component({
  selector: 'app-course-place',
  standalone: true,
  template: `@if (flag()) {<span class="flag" role="img" [attr.aria-label]="countryName()">{{ flag() }}</span>}{{ city() || countryName() }}`,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 6px; }
    .flag { font-size: 14px; line-height: 1; }
  `]
})
export class CoursePlaceComponent {
  private i18n = inject(I18nService);
  city = input<string | null | undefined>(null);
  country = input<string | null | undefined>(null);

  flag = computed(() => flagEmoji(this.country()));
  countryName = computed(() => {
    const code = this.country();
    if (!code) return '';
    try {
      return new Intl.DisplayNames([this.i18n.locale()], { type: 'region' }).of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  });
}
