import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <div class="ph">
      <div class="ph__text">
        <h1 class="ph__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="ph__sub">{{ subtitle() }}</p>
        }
      </div>
      <div class="ph__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .ph {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 22px;
        flex-wrap: wrap;
      }
      .ph__title {
        font-size: 24px;
        font-weight: 750;
        letter-spacing: -0.02em;
      }
      .ph__sub {
        color: var(--text-muted);
        margin-top: 4px;
        font-size: 14px;
      }
      .ph__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeaderComponent {
  title = input<string>('');
  subtitle = input<string>('');
}
