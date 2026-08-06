import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth">
      <aside class="auth__brand">
        <div class="auth__brand-top">
          <span class="auth__logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path
                d="M9 22V10l7 6 7-6v12"
                stroke="white"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>PROJECT FORGE</span>
          </span>
        </div>

        <div class="auth__pitch">
          <h1>Engineering project management,<br />all in one place.</h1>
          <p>
            Centralize projects, milestones, design reviews, clarifications and technical
            evidence — with the visibility your engineering team needs to ship.
          </p>
          <ul class="auth__features">
            <li><span>✓</span> Track milestones &amp; auto-calculated progress</li>
            <li><span>✓</span> Run design reviews with a preserved history</li>
            <li><span>✓</span> Resolve clarifications and store evidence</li>
          </ul>
        </div>

        <div class="auth__brand-foot">Built for engineering teams · MVP</div>
        <div class="auth__glow auth__glow--1"></div>
        <div class="auth__glow auth__glow--2"></div>
      </aside>

      <section class="auth__panel">
        <div class="auth__card">
          <ng-content />
        </div>
      </section>
    </div>
  `,
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
