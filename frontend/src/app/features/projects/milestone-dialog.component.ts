import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MilestonesService } from '../../core/api/milestones.service';
import { UsersService } from '../../core/api/users.service';
import type { Milestone, PublicUser } from '../../core/models';
import { MILESTONE_STATUS_META, PRIORITY_META } from '../../core/ui';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-milestone-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [title]="milestone() ? 'Edit milestone' : 'New milestone'"
      [subtitle]="milestone() ? 'Update the details below.' : 'Add a deliverable to this project.'"
      (dismiss)="close.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="ms-title">Title *</label>
          <input
            id="ms-title"
            class="input"
            formControlName="title"
            placeholder="e.g. Complete stress analysis"
            [class.input--invalid]="invalid('title')"
          />
          @if (invalid('title')) {
            <span class="field__error">A title is required.</span>
          }
        </div>

        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="ms-desc">Description</label>
          <textarea
            id="ms-desc"
            class="input"
            rows="2"
            formControlName="description"
            placeholder="Optional detail"
          ></textarea>
        </div>

        <div class="grid-2" style="margin-bottom: 16px">
          <div class="field">
            <label class="field__label" for="ms-status">Status</label>
            <select id="ms-status" class="input" formControlName="status">
              @for (o of statusOptions; track o.value) {
                <option [value]="o.value">{{ o.label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="ms-priority">Priority</label>
            <select id="ms-priority" class="input" formControlName="priority">
              @for (o of priorityOptions; track o.value) {
                <option [value]="o.value">{{ o.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: 16px">
          <div class="field">
            <label class="field__label" for="ms-due">Due date</label>
            <input id="ms-due" class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="field">
            <label class="field__label" for="ms-progress">Progress (%)</label>
            <input
              id="ms-progress"
              class="input"
              type="number"
              min="0"
              max="100"
              formControlName="progress"
              [class.input--invalid]="invalid('progress')"
            />
            @if (invalid('progress')) {
              <span class="field__error">Must be between 0 and 100.</span>
            }
          </div>
        </div>

        <div class="field" style="margin-bottom: 18px">
          <label class="field__label" for="ms-assignee">Assignee</label>
          <select id="ms-assignee" class="input" formControlName="assigneeId">
            <option value="">Unassigned</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.name }}</option>
            }
          </select>
        </div>

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <div class="modal-actions">
          <button class="btn btn--ghost" type="button" (click)="close.emit()">Cancel</button>
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : milestone() ? 'Save changes' : 'Create milestone' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [
    `
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .form-error {
        background: var(--danger-soft, #fdecec);
        color: var(--danger, #9c3030);
        border-radius: var(--radius-sm, 6px);
        padding: 9px 12px;
        font-size: 13px;
        margin-bottom: 14px;
      }
      @media (max-width: 520px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MilestoneDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MilestonesService);
  private readonly usersService = inject(UsersService);

  readonly projectId = input.required<string>();
  readonly milestone = input<Milestone | null>(null);

  readonly close = output<void>();
  readonly saved = output<Milestone>();

  readonly busy = signal(false);
  readonly error = signal('');
  readonly users = signal<PublicUser[]>([]);

  readonly statusOptions = Object.entries(MILESTONE_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));
  readonly priorityOptions = Object.entries(PRIORITY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: [''],
    status: ['NOT_STARTED'],
    priority: ['MEDIUM'],
    dueDate: [''],
    progress: [0, [Validators.min(0), Validators.max(100)]],
    assigneeId: [''],
  });

  constructor() {
    this.usersService.list().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([]),
    });

    queueMicrotask(() => {
      const m = this.milestone();
      if (!m) return;
      this.form.patchValue({
        title: m.title,
        description: m.description ?? '',
        status: m.status,
        priority: m.priority,
        dueDate: m.dueDate ? m.dueDate.slice(0, 10) : '',
        progress: m.progress ?? 0,
        assigneeId: m.assignee?.id ?? '',
      });
    });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      status: raw.status as Milestone['status'],
      priority: raw.priority as Milestone['priority'],
      dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
      progress: Number(raw.progress),
      assigneeId: raw.assigneeId || null,
    };

    this.busy.set(true);
    this.error.set('');

    const existing = this.milestone();
    const op = existing
      ? this.service.update(existing.id, payload)
      : this.service.create(this.projectId(), payload);

    op.subscribe({
      next: (milestone) => {
        this.busy.set(false);
        this.saved.emit(milestone);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Could not save the milestone.');
      },
    });
  }
}
