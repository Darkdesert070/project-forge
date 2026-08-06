import { Component, computed, input } from '@angular/core';
import { initials } from '../core/ui';

@Component({
  selector: 'app-avatar',
  template: `<span
    class="avatar"
    [style.width.px]="size()"
    [style.height.px]="size()"
    [style.background]="color()"
    [style.fontSize.px]="size() * 0.38"
    [title]="name()"
    >{{ text() }}</span
  >`,
})
export class AvatarComponent {
  name = input<string>('');
  color = input<string>('#5b5bf0');
  size = input<number>(34);
  text = computed(() => initials(this.name() || '?'));
}
