import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { initials } from './format';

/** A player's round profile picture, or their initials on teal when they have none (or it fails to load). */
@Component({
  selector: 'app-avatar',
  styles: [`
    :host { display: inline-flex; flex: none; border-radius: 999px; overflow: hidden; background: #2E5F5A; color: #fff;
            align-items: center; justify-content: center; font-weight: 600; line-height: 1; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `],
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.36'
  },
  template: `
    @if (url() && !failed()) {
      <img [src]="url()" alt="" loading="lazy" (error)="failed.set(true)">
    } @else {
      {{ letters() }}
    }
  `
})
export class AvatarComponent {
  private sb = inject(SupabaseService);

  name = input.required<string>();
  /** Storage path from profiles.avatar_url, e.g. "<user id>/1731090000.jpg". */
  path = input<string | null | undefined>(null);
  size = input(40);

  failed = signal(false);
  letters = computed(() => initials(this.name()));
  url = signal<string | null>(null);

  constructor() {
    effect(() => {
      const path = this.path();
      this.failed.set(false);
      this.url.set(null);
      if (!path) return;
      this.sb.avatarUrl(path).then((url) => {
        if (this.path() === path) this.url.set(url);
      });
    });
  }
}
