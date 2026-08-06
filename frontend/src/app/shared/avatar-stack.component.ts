import { Component, computed, input } from '@angular/core';
import { AvatarComponent } from './avatar.component';
import type { PublicUser } from '../core/models';

@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarComponent],
  template: `
    <div class="stack">
      @for (u of visible(); track u.id) {
        <span class="stack__item">
          <app-avatar [name]="u.name" [color]="u.avatarColor" [size]="size()" />
        </span>
      }
      @if (overflow() > 0) {
        <span
          class="stack__more"
          [style.width.px]="size()"
          [style.height.px]="size()"
          [style.fontSize.px]="size() * 0.34"
          >+{{ overflow() }}</span
        >
      }
    </div>
  `,
  styles: [
    `
      .stack {
        display: inline-flex;
        align-items: center;
      }
      .stack__item + .stack__item,
      .stack__more {
        margin-left: -9px;
      }
      .stack__more {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--surface-3);
        color: var(--text-muted);
        font-weight: 650;
        border: 2px solid var(--surface);
      }
    `,
  ],
})
export class AvatarStackComponent {
  users = input<PublicUser[]>([]);
  size = input<number>(30);
  max = input<number>(4);

  visible = computed(() => this.users().slice(0, this.max()));
  overflow = computed(() => Math.max(0, this.users().length - this.max()));
}
