import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  styleUrls: ['./auth-form.scss'],
  template: `
    <app-auth-layout>
      <div class="form__head">
        <h2 class="form__title">Create your workspace</h2>
        <p class="form__sub">Start managing engineering projects in minutes.</p>
      </div>

      @if (error()) {
        <div class="form__error">{{ error() }}</div>
      }

      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label class="field__label" for="name">Your name</label>
          <input
            id="name"
            class="input"
            formControlName="name"
            placeholder="Jane Engineer"
            autocomplete="name"
            [class.input--invalid]="invalid('name')"
          />
          @if (invalid('name')) {
            <span class="field__error">Please enter your name.</span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="workspaceName">Workspace / company</label>
          <input
            id="workspaceName"
            class="input"
            formControlName="workspaceName"
            placeholder="Meridian Engineering"
            [class.input--invalid]="invalid('workspaceName')"
          />
          @if (invalid('workspaceName')) {
            <span class="field__error">Please enter a workspace name.</span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="email">Work email</label>
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
            placeholder="At least 8 characters"
            autocomplete="new-password"
            [class.input--invalid]="invalid('password')"
          />
          @if (invalid('password')) {
            <span class="field__error">Password must be at least 8 characters.</span>
          }
        </div>

        <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner"></span>
          } @else {
            Create workspace
          }
        </button>
      </form>

      <p class="form__footer">Already have an account? <a routerLink="/login">Sign in</a></p>
    </app-auth-layout>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    workspaceName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Unable to create workspace. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
