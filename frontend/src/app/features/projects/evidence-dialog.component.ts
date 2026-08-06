import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvidenceService } from '../../core/api/evidence.service';
import type { Evidence } from '../../core/models';
import { EVIDENCE_TYPE_META } from '../../core/ui';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-evidence-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [title]="evidence() ? 'Edit evidence' : 'Attach evidence'"
      subtitle="Link a technical document, drawing or report."
      (dismiss)="close.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="ev-title">Title *</label>
          <input
            id="ev-title"
            class="input"
            formControlName="title"
            placeholder="e.g. Stress analysis report v3"
            [class.input--invalid]="invalid('title')"
          />
          @if (invalid('title')) {
            <span class="field__error">A title is required.</span>
          }
        </div>

        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="ev-type">Type</label>
          <select id="ev-type" class="input" formControlName="type">
            @for (o of typeOptions; track o.value) {
              <option [value]="o.value">{{ o.label }}</option>
            }
          </select>
        </div>

        <div class="field" style="margin-bottom: 16px">
          <label class="field__label" for="ev-url">Document URL *</label>
          <input
            id="ev-url"
            class="input"
            formControlName="url"
            placeholder="https://…"
            [class.input--invalid]="invalid('url')"
          />
          @if (invalid('url')) {
            <span class="field__error">A valid URL starting with http is required.</span>
          }
          <span class="field__hint">
            Evidence is stored as a link. File upload is not part of this release.
          </span>
        </div>

        <div class="field" style="margin-bottom: 18px">
          <label class="field__label" for="ev-desc">Description</label>
          <textarea
            id="ev-desc"
            class="input"
            rows="2"
            formControlName="description"
            placeholder="Optional context"
          ></textarea>
        </div>

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <div class="modal-actions">
          <button class="btn btn--ghost" type="button" (click)="close.emit()">Cancel</button>
          <button class="btn btn--primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : evidence() ? 'Save changes' : 'Attach evidence' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [
    `
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
    `,
  ],
})
export class EvidenceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EvidenceService);

  readonly projectId = input.required<string>();
  readonly evidence = input<Evidence | null>(null);

  readonly close = output<void>();
  readonly saved = output<Evidence>();

  readonly busy = signal(false);
  readonly error = signal('');

  readonly typeOptions = Object.entries(EVIDENCE_TYPE_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    type: ['LINK'],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]],
    description: [''],
  });

  constructor() {
    queueMicrotask(() => {
      const e = this.evidence();
      if (!e) return;
      this.form.patchValue({
        title: e.title,
        type: e.type,
        url: e.url,
        description: e.description ?? '',
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
      type: raw.type as Evidence['type'],
      url: raw.url.trim(),
      description: raw.description.trim(),
    };

    this.busy.set(true);
    this.error.set('');

    const existing = this.evidence();
    const op = existing
      ? this.service.update(existing.id, payload)
      : this.service.create(this.projectId(), payload);

    op.subscribe({
      next: (evidence) => {
        this.busy.set(false);
        this.saved.emit(evidence);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Could not save the evidence.');
      },
    });
  }
}
