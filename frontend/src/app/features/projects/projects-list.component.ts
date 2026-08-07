import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectsService } from '../../core/api/projects.service';
import { AuthService } from '../../core/auth/auth.service';
import type { Project, ProjectStatus } from '../../core/models';
import { PROJECT_STATUS_META, PRIORITY_META, formatDate } from '../../core/ui';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { BadgeComponent } from '../../shared/badge.component';
import { ProgressBarComponent } from '../../shared/progress-bar.component';
import { AvatarStackComponent } from '../../shared/avatar-stack.component';
import { IconComponent } from '../../shared/icon.component';

interface StatusFilter {
  value: ProjectStatus | 'ALL';
  label: string;
}

@Component({
  selector: 'app-projects-list',
  imports: [
    RouterLink,
    PageHeaderComponent,
    BadgeComponent,
    ProgressBarComponent,
    AvatarStackComponent,
    IconComponent,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;
  readonly statusMeta = PROJECT_STATUS_META;
  readonly priorityMeta = PRIORITY_META;
  readonly formatDate = formatDate;

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);

  /** Placeholder cards rendered while the list loads. */
  readonly skeletonCards = [0, 1, 2, 3, 4, 5];
  readonly error = signal('');

  readonly search = signal('');
  readonly activeStatus = signal<ProjectStatus | 'ALL'>('ALL');
  readonly showArchived = signal(false);

  readonly statusFilters: StatusFilter[] = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.activeStatus();
    return this.projects().filter((p) => {
      if (status !== 'ALL' && p.status !== status) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.client.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.projectsService.list({ archived: this.showArchived() }).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load projects.');
        this.loading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  setStatus(value: ProjectStatus | 'ALL'): void {
    this.activeStatus.set(value);
  }

  toggleArchived(): void {
    this.showArchived.update((v) => !v);
    this.activeStatus.set('ALL');
    this.load();
  }
}
