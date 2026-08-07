import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectsService } from '../../core/api/projects.service';
import { ClarificationsService } from '../../core/api/clarifications.service';
import { AuthService } from '../../core/auth/auth.service';
import type {
  Clarification,
  Evidence,
  Milestone,
  ProjectDetail,
  Review,
} from '../../core/models';
import {
  CLARIFICATION_STATUS_META,
  EVIDENCE_TYPE_META,
  MILESTONE_STATUS_META,
  PRIORITY_META,
  PROJECT_STATUS_META,
  REVIEW_DECISION_META,
  activityLabel,
  formatDate,
  relativeTime,
} from '../../core/ui';
import { BadgeComponent } from '../../shared/badge.component';
import { ProgressBarComponent } from '../../shared/progress-bar.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';
import { MilestoneDialogComponent } from './milestone-dialog.component';
import { ReviewDialogComponent } from './review-dialog.component';
import { ClarificationDialogComponent } from './clarification-dialog.component';
import { EvidenceDialogComponent } from './evidence-dialog.component';

type Tab = 'overview' | 'milestones' | 'reviews' | 'clarifications' | 'evidence' | 'members' | 'activity';

@Component({
  selector: 'app-project-detail',
  imports: [
    RouterLink,
    BadgeComponent,
    ProgressBarComponent,
    AvatarComponent,
    IconComponent,
    MilestoneDialogComponent,
    ReviewDialogComponent,
    ClarificationDialogComponent,
    EvidenceDialogComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly clarificationsService = inject(ClarificationsService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;
  readonly project = signal<ProjectDetail | null>(null);
  readonly loading = signal(true);

  /** Placeholder rows rendered while the project loads. */
  readonly skeletonRows = [0, 1, 2, 3];
  readonly error = signal('');
  readonly busy = signal(false);
  readonly activeTab = signal<Tab>('overview');

  // Dialog state. Each holds null when closed; editing targets carry the record.
  readonly milestoneDialog = signal<{ open: boolean; target: Milestone | null }>({
    open: false,
    target: null,
  });
  readonly reviewDialog = signal<{ open: boolean; target: Review | null }>({
    open: false,
    target: null,
  });
  readonly clarificationDialog = signal<{
    open: boolean;
    mode: 'raise' | 'answer';
    target: Clarification | null;
  }>({ open: false, mode: 'raise', target: null });
  readonly evidenceDialog = signal<{ open: boolean; target: Evidence | null }>({
    open: false,
    target: null,
  });

  /** Writes are refused by the API on an archived project, so hide the controls. */
  readonly canWrite = computed(() => {
    const p = this.project();
    return !!p && !p.archived;
  });

  readonly statusMeta = PROJECT_STATUS_META;
  readonly priorityMeta = PRIORITY_META;
  readonly milestoneMeta = MILESTONE_STATUS_META;
  readonly reviewMeta = REVIEW_DECISION_META;
  readonly clarificationMeta = CLARIFICATION_STATUS_META;
  readonly evidenceMeta = EVIDENCE_TYPE_META;
  readonly formatDate = formatDate;
  readonly relativeTime = relativeTime;
  readonly activityLabel = activityLabel;

  readonly tabs: { id: Tab; label: string; count?: () => number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'milestones', label: 'Milestones', count: () => this.project()?.milestones.length ?? 0 },
    { id: 'reviews', label: 'Reviews', count: () => this.project()?.reviews.length ?? 0 },
    {
      id: 'clarifications',
      label: 'Clarifications',
      count: () => this.project()?.clarifications.length ?? 0,
    },
    { id: 'evidence', label: 'Evidence', count: () => this.project()?.evidence.length ?? 0 },
    { id: 'members', label: 'Members', count: () => this.project()?.members.length ?? 0 },
    { id: 'activity', label: 'Activity' },
  ];

  readonly timeframe = computed(() => {
    const p = this.project();
    if (!p) return '';
    if (!p.startDate && !p.endDate) return 'No dates set';
    return `${formatDate(p.startDate)} → ${formatDate(p.endDate)}`;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.projectsService.get(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Project not found or you do not have access.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  // ---------------------------------------------------------------- milestones

  openMilestone(target: Milestone | null = null): void {
    this.milestoneDialog.set({ open: true, target });
  }

  closeMilestone(): void {
    this.milestoneDialog.set({ open: false, target: null });
  }

  onMilestoneSaved(milestone: Milestone): void {
    this.upsert('milestones', milestone);
    this.closeMilestone();
  }

  // ---------------------------------------------------------------- reviews

  openReview(target: Review | null = null): void {
    this.reviewDialog.set({ open: true, target });
  }

  closeReview(): void {
    this.reviewDialog.set({ open: false, target: null });
  }

  onReviewSaved(review: Review): void {
    this.upsert('reviews', review);
    this.closeReview();
  }

  // ---------------------------------------------------------------- clarifications

  openClarification(mode: 'raise' | 'answer', target: Clarification | null = null): void {
    this.clarificationDialog.set({ open: true, mode, target });
  }

  closeClarification(): void {
    this.clarificationDialog.set({ open: false, mode: 'raise', target: null });
  }

  onClarificationSaved(clarification: Clarification): void {
    this.upsert('clarifications', clarification);
    this.closeClarification();
  }

  /**
   * ANSWERED -> CLOSED. No form is needed, so this calls the API directly.
   * The server rejects the transition from any other state with 409.
   */
  closeClarificationRecord(c: Clarification): void {
    if (!confirm('Close this clarification? It cannot be reopened.')) return;
    this.busy.set(true);
    this.clarificationsService.close(c.id).subscribe({
      next: (updated) => {
        this.upsert('clarifications', updated);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        alert(err?.error?.error ?? 'Could not close the clarification.');
      },
    });
  }

  // ---------------------------------------------------------------- evidence

  openEvidence(target: Evidence | null = null): void {
    this.evidenceDialog.set({ open: true, target });
  }

  closeEvidence(): void {
    this.evidenceDialog.set({ open: false, target: null });
  }

  onEvidenceSaved(evidence: Evidence): void {
    this.upsert('evidence', evidence);
    this.closeEvidence();
  }

  // ---------------------------------------------------------------- shared

  /**
   * Replaces the record in place when it already exists, otherwise appends it,
   * so the screen updates without a full reload of the project.
   */
  private upsert<K extends 'milestones' | 'reviews' | 'clarifications' | 'evidence'>(
    key: K,
    record: ProjectDetail[K][number],
  ): void {
    this.project.update((p) => {
      if (!p) return p;
      const list = p[key] as { id: string }[];
      const index = list.findIndex((item) => item.id === (record as { id: string }).id);
      const next = index >= 0
        ? [...list.slice(0, index), record, ...list.slice(index + 1)]
        : [...list, record];
      return { ...p, [key]: next } as ProjectDetail;
    });
  }

  edit(): void {
    const p = this.project();
    if (p) this.router.navigate(['/projects', p.id, 'edit']);
  }

  toggleArchive(): void {
    const p = this.project();
    if (!p) return;
    this.busy.set(true);
    const op = p.archived ? this.projectsService.restore(p.id) : this.projectsService.archive(p.id);
    op.subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.busy.set(false);
      },
      error: () => this.busy.set(false),
    });
  }

  remove(): void {
    const p = this.project();
    if (!p) return;
    if (!confirm(`Delete "${p.name}"? This permanently removes the project and all its data.`)) {
      return;
    }
    this.busy.set(true);
    this.projectsService.remove(p.id).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: () => this.busy.set(false),
    });
  }
}
