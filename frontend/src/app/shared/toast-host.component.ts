import { Component, inject } from '@angular/core';
import { IconComponent } from './icon.component';
import { ToastService, type ToastTone } from '../core/toast';

const ICON_FOR: Record<ToastTone, string> = {
  success: 'checkCircle',
  error: 'alertCircle',
  warning: 'alertTriangle',
  info: 'info',
};

/**
 * Renders the global toast stack. Mounted once at the application root so it
 * survives navigation and sits above every dialog.
 */
@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  template: `
    <div class="toasts" role="region" aria-label="Notifications">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast toast--{{ toast.tone }}"
          [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.tone === 'error' ? 'assertive' : 'polite'"
        >
          <span class="toast__icon">
            <app-icon [name]="icon(toast.tone)" [size]="18" />
          </span>
          <div class="toast__text">
            <p class="toast__message">{{ toast.message }}</p>
            @if (toast.detail) {
              <p class="toast__detail">{{ toast.detail }}</p>
            }
          </div>
          <button
            type="button"
            class="toast__close"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  protected icon(tone: ToastTone): string {
    return ICON_FOR[tone];
  }
}
