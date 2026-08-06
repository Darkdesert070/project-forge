import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewsService } from '../../core/api/reviews.service';
import { UsersService } from '../../core/api/users.service';
import type { PublicUser, Review } from '../../core/models';
import { REVIEW_DECISION_META } from '../../core/ui';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-review-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [title]="review() ? 'Edit design review' : 'New design review'"
      [subtitle]="'Record a reviewer, a decision and any comments.'"
      (dismiss)="close.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="rv-title">Title *</label>
          <input
            id="rv-title"
            class="input"
            formControlName="title"
            placeholder="e.g. Preliminary Design Review"
            [class.input--invalid]="invalid('title')"
          />
          @if (invalid('title')) {
            <span class="field__error">A title is required.</span>
          }
        </div>

        <div class="grid-2" style="margin-bottom: 16px">
          <div class="field">
            <label class="field__label" for="rv-reviewer">Reviewer</label>
            <select id="rv-reviewer" class="input" formControlName="reviewerId">
              <option value="">Not assigned</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="rv-date">Review date</label>
            <input id="rv-date" class="input" type="date" formControlName="reviewDate" />
          </div>
        </div>

        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="rv-decision">Decision</label>
          <select id="rv-decision" class="input" formControlName="decision">
            @for (o of decisionOptions; track o.value) {
              <option [value]="o.value">{{ o.label }}</option>
            }
          </select>
        </div>

        <div class="field" style="margin-bottom: 18px">
          <label class="field__label" for="rv-comments">
            Comments{{ form.value.decision === 'REJECTED' ? ' *' : '' }}
          </label>
          <textarea
            id="rv-comments"
            class="input"
            rows="3"
            formControlName="comments"
            placeholder="Findings, conditions or required changes"
          ></textarea>
          @if (form.value.decision === 'REJECTED') {
            <span class="field__hint">A rejected review must record why.</span>
          }
        </div>

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <div class="modal-actions">
          <button class="btn btn--ghost" type="button" (click)="close.emit()">Cancel</button>
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : review() ? 'Save changes' : 'Create review' }}
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
      .field__hint {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 5px;
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
export class ReviewDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReviewsService);
  private readonly usersService = inject(UsersService);

  readonly projectId = input.required<string>();
  readonly review = input<Review | null>(null);

  readonly close = output<void>();
  readonly saved = output<Review>();

  readonly busy = signal(false);
  readonly error = signal('');
  readonly users = signal<PublicUser[]>([]);

  readonly decisionOptions = Object.entries(REVIEW_DECISION_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  readonly form = this.fb.nonNullable.group({
    title: ['Design Review', [Validators.required, Validators.maxLength(160)]],
    reviewerId: [''],
    reviewDate: [new Date().toISOString().slice(0, 10)],
    decision: ['PENDING'],
    comments: [''],
  });

  constructor() {
    this.usersService.list().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([]),
    });

    queueMicrotask(() => {
      const r = this.review();
      if (!r) return;
      this.form.patchValue({
        title: r.title,
        reviewerId: r.reviewer?.id ?? '',
        reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : '',
        decision: r.decision,
        comments: r.comments ?? '',
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

    // Mirrors the server rule so the user is told before the request is sent.
    if (raw.decision === 'REJECTED' && !raw.comments.trim()) {
      this.error.set('Comments are required when a review is rejected.');
      return;
    }

    const payload = {
      title: raw.title.trim(),
      reviewerId: raw.reviewerId || null,
      reviewDate: raw.reviewDate ? new Date(raw.reviewDate).toISOString() : undefined,
      decision: raw.decision as Review['decision'],
      comments: raw.comments.trim(),
    };

    this.busy.set(true);
    this.error.set('');

    const existing = this.review();
    const op = existing
      ? this.service.update(existing.id, payload)
      : this.service.create(this.projectId(), payload);

    op.subscribe({
      next: (review) => {
        this.busy.set(false);
        this.saved.emit(review);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Could not save the design review.');
      },
    });
  }
}
