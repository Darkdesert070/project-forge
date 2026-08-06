import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span [class]="'badge badge--' + tone() + (plain() ? ' badge--plain' : '')">{{
    label()
  }}</span>`,
})
export class BadgeComponent {
  label = input<string>('');
  tone = input<string>('neutral');
  plain = input<boolean>(false);
}
