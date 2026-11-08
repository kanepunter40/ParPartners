import { Component, input } from '@angular/core';

export type Scene = 'friends' | 'search' | 'scorecard' | 'green';

/** Decorative empty-state scenes in the Coastal Links palette. Each screen uses its own scene. */
@Component({
  selector: 'app-illustration',
  styles: [`:host { display: block; } svg { display: block; width: 100%; height: auto; }`],
  template: `
    <svg viewBox="0 0 240 140" aria-hidden="true" focusable="false">
      <!-- shared backdrop: sun and rolling hills -->
      <circle cx="196" cy="34" r="16" fill="#F3E4D6" />
      <path d="M0 104 C40 84 82 84 120 96 S196 112 240 92 V140 H0 Z" fill="#E3ECE9" />
      <path d="M0 122 C52 104 108 106 150 114 S214 124 240 114 V140 H0 Z" fill="#C9DAD5" />

      @switch (scene()) {
        @case ('friends') {
          <!-- two balls on tees, side by side, with a small heart between them -->
          <path d="M84 112 L90 112 L88 124 L86 124 Z" fill="#C97B4A" />
          <path d="M150 112 L156 112 L154 124 L152 124 Z" fill="#C97B4A" />
          <ellipse cx="87" cy="111" rx="7" ry="2" fill="#B16C41" />
          <ellipse cx="153" cy="111" rx="7" ry="2" fill="#B16C41" />
          <circle cx="87" cy="97" r="13" fill="#FFFFFF" stroke="#D9D2BA" stroke-width="1.2" />
          <circle cx="153" cy="97" r="13" fill="#FFFFFF" stroke="#D9D2BA" stroke-width="1.2" />
          <g fill="#E6DFC9">
            <circle cx="82" cy="93" r="1.4" /><circle cx="88" cy="91" r="1.4" /><circle cx="93" cy="96" r="1.4" /><circle cx="84" cy="100" r="1.4" /><circle cx="90" cy="102" r="1.4" />
            <circle cx="148" cy="93" r="1.4" /><circle cx="154" cy="91" r="1.4" /><circle cx="159" cy="96" r="1.4" /><circle cx="150" cy="100" r="1.4" /><circle cx="156" cy="102" r="1.4" />
          </g>
          <path d="M120 74 C114 66 104 72 112 80 L120 87 L128 80 C136 72 126 66 120 74 Z" fill="#2E5F5A" />
        }
        @case ('search') {
          <!-- a map pin over the course, with a dashed search radius -->
          <ellipse cx="120" cy="108" rx="70" ry="16" fill="none" stroke="#2E5F5A" stroke-width="1.6" stroke-dasharray="4 5" opacity=".6" />
          <ellipse cx="120" cy="108" rx="34" ry="8" fill="#2E5F5A" opacity=".18" />
          <line x1="168" y1="104" x2="168" y2="80" stroke="#1F3532" stroke-width="1.6" stroke-linecap="round" />
          <path d="M169 81 L184 85 L169 90 Z" fill="#C97B4A" />
          <path d="M120 106 C108 90 100 80 100 68 A20 20 0 0 1 140 68 C140 80 132 90 120 106 Z" fill="#2E5F5A" />
          <circle cx="120" cy="67" r="7.5" fill="#F4F1E8" />
        }
        @case ('scorecard') {
          <!-- a scorecard on the grass with a pencil -->
          <g transform="rotate(-6 120 80)">
            <rect x="78" y="42" width="84" height="74" rx="6" fill="#FFFFFF" stroke="#D9D2BA" stroke-width="1.2" />
            <rect x="78" y="42" width="84" height="14" rx="6" fill="#2E5F5A" />
            <rect x="78" y="50" width="84" height="6" fill="#2E5F5A" />
            <g stroke="#EFEAD9" stroke-width="1.2">
              <line x1="86" y1="68" x2="154" y2="68" /><line x1="86" y1="80" x2="154" y2="80" /><line x1="86" y1="92" x2="154" y2="92" /><line x1="86" y1="104" x2="154" y2="104" />
              <line x1="108" y1="60" x2="108" y2="110" /><line x1="131" y1="60" x2="131" y2="110" />
            </g>
            <g fill="#5F5B4E" font-family="Work Sans, sans-serif" font-size="8" font-weight="600" text-anchor="middle">
              <text x="97" y="77">4</text><text x="120" y="77">5</text><text x="97" y="89">3</text><text x="120" y="89">4</text>
            </g>
            <circle cx="120" cy="86" r="6" fill="none" stroke="#C97B4A" stroke-width="1.4" />
          </g>
          <g transform="rotate(38 168 96)">
            <rect x="140" y="92" width="50" height="8" rx="1.5" fill="#C97B4A" />
            <rect x="186" y="92" width="6" height="8" fill="#E6DFC9" />
            <path d="M140 92 L130 96 L140 100 Z" fill="#F3E4D6" />
            <path d="M133 95 L130 96 L133 97 Z" fill="#1F3532" />
          </g>
        }
        @default {
          <!-- a flag on the green, a ball rolling towards the cup -->
          <ellipse cx="128" cy="106" rx="62" ry="13" fill="#2E5F5A" opacity=".9" />
          <ellipse cx="146" cy="105" rx="7" ry="2.6" fill="#1F3532" />
          <line x1="146" y1="105" x2="146" y2="40" stroke="#1F3532" stroke-width="2.4" stroke-linecap="round" />
          <path d="M147 41 L176 49 L147 58 Z" fill="#C97B4A" />
          <circle cx="104" cy="104" r="4.6" fill="#FFFFFF" stroke="#D9D2BA" stroke-width="1" />
          <path d="M74 110 Q86 104 98 105" stroke="#E3ECE9" stroke-width="1.6" fill="none" stroke-dasharray="2 4" stroke-linecap="round" />
        }
      }
    </svg>
  `
})
export class IllustrationComponent {
  scene = input<Scene>('green');
}
