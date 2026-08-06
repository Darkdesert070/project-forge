import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat card">
      <div class="stat__top">
        <span class="stat__icon" [class]="'stat__icon--' + tone()">{{ icon() }}</span>
        @if (hint()) {
          <span class="stat__hint">{{ hint() }}</span>
        }
      </div>
      <div class="stat__value">{{ value() }}</div>
      <div class="stat__label">{{ label() }}</div>
    </div>
  `,
  styles: [
    `
      .stat {
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .stat__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 11px;
        font-size: 19px;
        background: var(--primary-50);
      }
      .stat__icon--info {
        background: var(--info-bg);
      }
      .stat__icon--success {
        background: var(--success-bg);
      }
      .stat__icon--warning {
        background: var(--warning-bg);
      }
      .stat__icon--danger {
        background: var(--danger-bg);
      }
      .stat__hint {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-subtle);
      }
      .stat__value {
        font-size: 28px;
        font-weight: 750;
        letter-spacing: -0.02em;
      }
      .stat__label {
        font-size: 13px;
        color: var(--text-muted);
        font-weight: 500;
      }
    `,
  ],
})
export class StatCardComponent {
  icon = input<string>('•');
  value = input<string | number>('');
  label = input<string>('');
  hint = input<string>('');
  tone = input<string>('primary');
}
