import { Component, output, input } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    <div class="modal-backdrop" (click)="dismiss.emit()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog">
        <div class="modal__head">
          <div>
            <h3 class="modal__title">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="modal__sub">{{ subtitle() }}</p>
            }
          </div>
          <button class="modal__x" type="button" (click)="dismiss.emit()" aria-label="Close">×</button>
        </div>
        <div class="modal__body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 22, 31, 0.45);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 100;
        animation: fadeUp 0.15s ease both;
      }
      .modal {
        background: var(--surface);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        width: 100%;
        max-width: 460px;
        max-height: 90vh;
        overflow: auto;
        animation: fadeUp 0.2s ease both;
      }
      .modal__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 22px 0;
      }
      .modal__title {
        font-size: 18px;
        font-weight: 700;
      }
      .modal__sub {
        color: var(--text-muted);
        font-size: 13px;
        margin-top: 3px;
      }
      .modal__x {
        border: none;
        background: transparent;
        font-size: 24px;
        line-height: 1;
        color: var(--text-subtle);
        cursor: pointer;
        padding: 0 4px;
      }
      .modal__x:hover {
        color: var(--text);
      }
      .modal__body {
        padding: 18px 22px 22px;
      }
    `,
  ],
})
export class ModalComponent {
  title = input<string>('');
  subtitle = input<string>('');
  dismiss = output<void>();
}
