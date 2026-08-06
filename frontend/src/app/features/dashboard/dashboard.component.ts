import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/api/dashboard.service';
import { AuthService } from '../../core/auth/auth.service';
import type { DashboardData } from '../../core/models';
import {
  MILESTONE_STATUS_META,
  PRIORITY_META,
  PROJECT_STATUS_META,
  activityLabel,
  formatDate,
  relativeTime,
} from '../../core/ui';
import type { ChartSegment } from '../../shared/donut-chart.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatCardComponent } from '../../shared/stat-card.component';
import { DonutChartComponent } from '../../shared/donut-chart.component';
import { BarChartComponent } from '../../shared/bar-chart.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { BadgeComponent } from '../../shared/badge.component';
import { IconComponent } from '../../shared/icon.component';

const PROJECT_STATUS_COLOR: Record<string, string> = {
  PLANNING: '#2f7fe0',
  ACTIVE: '#5b5bf0',
  ON_HOLD: '#d98a04',
  COMPLETED: '#17a06a',
};

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  NOT_STARTED: '#9aa0b4',
  IN_PROGRESS: '#5b5bf0',
  COMPLETED: '#17a06a',
  DELAYED: '#e0483d',
};

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    DonutChartComponent,
    BarChartComponent,
    AvatarComponent,
    BadgeComponent,
    IconComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;
  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly formatDate = formatDate;
  readonly relativeTime = relativeTime;
  readonly activityLabel = activityLabel;
  readonly priorityMeta = PRIORITY_META;
  readonly milestoneMeta = MILESTONE_STATUS_META;

  readonly projectSegments = computed<ChartSegment[]>(() =>
    (this.data()?.charts.projectsByStatus ?? []).map((s) => ({
      label: PROJECT_STATUS_META[s.status]?.label ?? s.status,
      value: s.count,
      color: PROJECT_STATUS_COLOR[s.status] ?? '#9aa0b4',
    })),
  );

  readonly milestoneSegments = computed<ChartSegment[]>(() =>
    (this.data()?.charts.milestonesByStatus ?? []).map((s) => ({
      label: MILESTONE_STATUS_META[s.status]?.label ?? s.status,
      value: s.count,
      color: MILESTONE_STATUS_COLOR[s.status] ?? '#9aa0b4',
    })),
  );

  constructor() {
    this.dashboardService.load().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your dashboard. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
