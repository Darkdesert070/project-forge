import { Component, computed, input } from '@angular/core';
import type { ChartSegment } from './donut-chart.component';

@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="bars" [style.height.px]="height()">
      @for (bar of bars(); track bar.label) {
        <div class="bar">
          <div class="bar__track">
            <div
              class="bar__fill"
              [style.height.%]="bar.pct"
              [style.background]="bar.color"
              [title]="bar.label + ': ' + bar.value"
            >
              <span class="bar__value">{{ bar.value }}</span>
            </div>
          </div>
          <span class="bar__label">{{ bar.label }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .bars {
        display: flex;
        align-items: flex-end;
        gap: 14px;
        padding-top: 8px;
      }
      .bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
      }
      .bar__track {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .bar__fill {
        width: 100%;
        max-width: 46px;
        border-radius: 8px 8px 4px 4px;
        min-height: 4px;
        position: relative;
        display: flex;
        justify-content: center;
        transition: height 0.5s ease;
      }
      .bar__value {
        position: absolute;
        top: -20px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
      }
      .bar__label {
        margin-top: 10px;
        font-size: 11.5px;
        color: var(--text-muted);
        text-align: center;
        font-weight: 500;
      }
    `,
  ],
})
export class BarChartComponent {
  segments = input<ChartSegment[]>([]);
  height = input<number>(180);

  private max = computed(() => Math.max(1, ...this.segments().map((s) => s.value)));

  bars = computed(() =>
    this.segments().map((s) => ({
      ...s,
      pct: Math.round((s.value / this.max()) * 100),
    })),
  );
}
