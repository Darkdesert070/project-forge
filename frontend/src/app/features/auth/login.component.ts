import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  styleUrls: ['./auth-form.scss'],
  template: `
    <app-auth-layout>
      <div class="form__head">
        <h2 class="form__title">Welcome back</h2>
        <p class="form__sub">Sign in to your engineering workspace.</p>
      </div>

      @if (error()) {
        <div class="form__error">{{ error() }}</div>
      }

      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label class="field__label" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="input"
            formControlName="email"
            placeholder="you@company.com"
            autocomplete="email"
            [class.input--invalid]="invalid('email')"
          />
          @if (invalid('email')) {
            <span class="field__error">Enter a valid email address.</span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="input"
            formControlName="password"
            placeholder="••••••••"
            autocomplete="current-password"
            [class.input--invalid]="invalid('password')"
          />
          @if (invalid('password')) {
            <span class="field__error">Password is required.</span>
          }
        </div>

        <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner"></span>
          } @else {
            Sign in
          }
        </button>
      </form>

      @if (showDemoHint) {
        <div class="demo">
          <span>Demo: <code>admin&#64;forge.dev</code> / <code>Password123!</code></span>
          <button type="button" (click)="fillDemo()">Use demo</button>
        </div>
      }

      <p class="form__footer">
        Don't have a workspace? <a routerLink="/register">Create one</a>
        <span class="auth-sep">·</span>
        <a routerLink="/organisations">Browse organisations</a>
      </p>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  /**
   * Seeded credentials are shown only when the app is served locally.
   * On a public deployment they would hand an administrator account to
   * every visitor, so the hint is suppressed off localhost.
   */
  readonly showDemoHint =
    typeof location !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(location.hostname);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  fillDemo(): void {
    this.form.setValue({ email: 'admin@forge.dev', password: 'Password123!' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Unable to sign in. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
