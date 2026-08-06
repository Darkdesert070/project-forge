import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClarificationsService } from '../../core/api/clarifications.service';
import { UsersService } from '../../core/api/users.service';
import type { Clarification, PublicUser } from '../../core/models';
import { PRIORITY_META } from '../../core/ui';
import { ModalComponent } from '../../shared/modal.component';

/**
 * Two modes:
 *   'raise'  — create a new clarification, which always starts in OPEN
 *   'answer' — supply an answer, moving OPEN to ANSWERED
 * Closing needs no form and is handled directly by the parent.
 */
@Component({
  selector: 'app-clarification-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [title]="isAnswer() ? 'Answer clarification' : 'Raise a clarification'"
      [subtitle]="
        isAnswer()
          ? 'The clarification moves to Answered and can then be closed.'
          : 'The clarification starts in the Open state.'
      "
      (dismiss)="close.emit()"
    >
      @if (isAnswer()) {
        <div class="question-recap">
          <span class="question-recap__label">Question</span>
          <p class="question-recap__text">{{ clarification()?.question }}</p>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (!isAnswer()) {
          <div class="field" style="margin-bottom: 16px">
            <label class="field__label" for="cl-question">Question *</label>
            <textarea
              id="cl-question"
              class="input"
              rows="3"
              formControlName="question"
              placeholder="What needs clarifying?"
              [class.input--invalid]="invalid('question')"
            ></textarea>
            @if (invalid('question')) {
              <span class="field__error">A question is required.</span>
            }
          </div>

          <div class="grid-2" style="margin-bottom: 18px">
            <div class="field">
              <label class="field__label" for="cl-priority">Priority</label>
              <select id="cl-priority" class="input" formControlName="priority">
                @for (o of priorityOptions; track o.value) {
                  <option [value]="o.value">{{ o.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="field__label" for="cl-assignee">Assign to</label>
              <select id="cl-assignee" class="input" formControlName="assigneeId">
                <option value="">Unassigned</option>
                @for (u of users(); track u.id) {
                  <option [value]="u.id">{{ u.name }}</option>
                }
              </select>
            </div>
          </div>
        } @else {
          <div class="field" style="margin-bottom: 18px">
            <label class="field__label" for="cl-answer">Answer *</label>
            <textarea
              id="cl-answer"
              class="input"
              rows="4"
              formControlName="answer"
              placeholder="Provide the answer"
              [class.input--invalid]="invalid('answer')"
            ></textarea>
            @if (invalid('answer')) {
              <span class="field__error">An answer is required.</span>
            }
          </div>
        }

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <div class="modal-actions">
          <button class="btn btn--ghost" type="button" (click)="close.emit()">Cancel</button>
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : isAnswer() ? 'Submit answer' : 'Raise clarification' }}
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
      .question-recap {
        background: var(--surface-alt, #f4f7fa);
        border-radius: var(--radius-sm, 6px);
        padding: 11px 13px;
        margin-bottom: 16px;
      }
      .question-recap__label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-subtle);
      }
      .question-recap__text {
        margin-top: 4px;
        font-size: 14px;
        line-height: 1.45;
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
export class ClarificationDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClarificationsService);
  private readonly usersService = inject(UsersService);

  readonly projectId = input.required<string>();
  readonly mode = input<'raise' | 'answer'>('raise');
  readonly clarification = input<Clarification | null>(null);

  readonly close = output<void>();
  readonly saved = output<Clarification>();

  readonly busy = signal(false);
  readonly error = signal('');
  readonly users = signal<PublicUser[]>([]);

  readonly isAnswer = computed(() => this.mode() === 'answer');

  readonly priorityOptions = Object.entries(PRIORITY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  readonly form = this.fb.nonNullable.group({
    question: ['', [Validators.required, Validators.maxLength(4000)]],
    priority: ['MEDIUM'],
    assigneeId: [''],
    answer: [''],
  });

  constructor() {
    this.usersService.list().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([]),
    });

    queueMicrotask(() => {
      if (this.isAnswer()) {
        this.form.controls.question.clearValidators();
        this.form.controls.question.updateValueAndValidity();
        this.form.controls.answer.setValidators([Validators.required, Validators.maxLength(4000)]);
        this.form.controls.answer.updateValueAndValidity();
      }
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
    this.busy.set(true);
    this.error.set('');

    const existing = this.clarification();
    const op =
      this.isAnswer() && existing
        ? this.service.answer(existing.id, raw.answer.trim())
        : this.service.create(this.projectId(), {
            question: raw.question.trim(),
            priority: raw.priority as Clarification['priority'],
            assigneeId: raw.assigneeId || null,
          });

    op.subscribe({
      next: (clarification) => {
        this.busy.set(false);
        this.saved.emit(clarification);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Could not save the clarification.');
      },
    });
  }
}
