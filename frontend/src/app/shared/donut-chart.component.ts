import { Component, computed, input } from '@angular/core';

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface Arc extends ChartSegment {
  dash: string;
  offset: number;
}

@Component({
  selector: 'app-donut',
  template: `
    <div class="donut">
      <svg
        [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
        [style.width.px]="size()"
        [style.height.px]="size()"
      >
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          stroke="var(--surface-3)"
          [attr.stroke-width]="thickness()"
        />
        @for (arc of arcs(); track arc.label) {
          <circle
            [attr.cx]="center()"
            [attr.cy]="center()"
            [attr.r]="radius()"
            fill="none"
            [attr.stroke]="arc.color"
            [attr.stroke-width]="thickness()"
            [attr.stroke-dasharray]="arc.dash"
            [attr.stroke-dashoffset]="arc.offset"
            [attr.transform]="'rotate(-90 ' + center() + ' ' + center() + ')'"
          />
        }
      </svg>
      <div class="donut__center">
        <div class="donut__value">{{ total() }}</div>
        <div class="donut__label">{{ centerLabel() }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .donut {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .donut__center {
        position: absolute;
        text-align: center;
      }
      .donut__value {
        font-size: 26px;
        font-weight: 750;
        letter-spacing: -0.02em;
      }
      .donut__label {
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ],
})
export class DonutChartComponent {
  segments = input<ChartSegment[]>([]);
  size = input<number>(160);
  thickness = input<number>(18);
  centerLabel = input<string>('Total');

  center = computed(() => this.size() / 2);
  radius = computed(() => this.center() - this.thickness() / 2 - 2);
  total = computed(() => this.segments().reduce((s, seg) => s + seg.value, 0));

  private circumference = computed(() => 2 * Math.PI * this.radius());

  arcs = computed<Arc[]>(() => {
    const total = this.total();
    const c = this.circumference();
    if (total <= 0) return [];
    const gap = 2;
    let cumulative = 0;
    return this.segments()
      .filter((s) => s.value > 0)
      .map((seg) => {
        const len = (seg.value / total) * c;
        const visible = Math.max(len - gap, 0.5);
        const arc: Arc = {
          ...seg,
          dash: `${visible} ${c - visible}`,
          offset: -cumulative,
        };
        cumulative += len;
        return arc;
      });
  });
}
