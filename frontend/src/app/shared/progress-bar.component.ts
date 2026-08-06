import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress',
  template: `
    <div class="wrap">
      <div class="progress" [style.height.px]="height()">
        <div class="progress__bar" [style.width.%]="clamped()"></div>
      </div>
      @if (showValue()) {
        <span class="val">{{ clamped() }}%</span>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .progress {
        flex: 1;
      }
      .val {
        font-size: 12px;
        font-weight: 650;
        color: var(--text-muted);
        min-width: 34px;
        text-align: right;
      }
    `,
  ],
})
export class ProgressBarComponent {
  value = input<number>(0);
  height = input<number>(8);
  showValue = input<boolean>(false);
  clamped = computed(() => Math.round(Math.max(0, Math.min(100, this.value() ?? 0))));
}
