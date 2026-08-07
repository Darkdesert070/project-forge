import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** Optional second line for detail, e.g. a server error code. */
  detail?: string;
}

/** How long each tone stays on screen, in milliseconds. */
const LIFETIME: Record<ToastTone, number> = {
  success: 3200,
  info: 3800,
  warning: 5000,
  error: 6500,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Read-only view consumed by the toast host component. */
  readonly toasts = this.items.asReadonly();

  success(message: string, detail?: string): void {
    this.push('success', message, detail);
  }

  error(message: string, detail?: string): void {
    this.push('error', message, detail);
  }

  info(message: string, detail?: string): void {
    this.push('info', message, detail);
  }

  warning(message: string, detail?: string): void {
    this.push('warning', message, detail);
  }

  /**
   * Convenience for HTTP failures: uses the server's `error` field when present
   * and falls back to the supplied message.
   */
  fromHttp(err: { error?: { error?: string } } | null, fallback: string): void {
    this.error(err?.error?.error ?? fallback);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.items.set([]);
  }

  private push(tone: ToastTone, message: string, detail?: string): void {
    const id = ++this.seq;
    this.items.update((list) => {
      const next = [...list, { id, tone, message, detail }];
      // Never stack more than four; drop the oldest so the corner stays readable.
      return next.length > 4 ? next.slice(next.length - 4) : next;
    });
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), LIFETIME[tone]),
    );
  }
}
