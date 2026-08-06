import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DirectoryService, type PublicOrganisation } from '../../core/api/directory.service';
import { IconComponent } from '../../shared/icon.component';

/**
 * Public organisation lookup. Reachable without signing in, and shows only what
 * an organisation has chosen to publish: name, tagline and record counts.
 */
@Component({
  selector: 'app-directory-search',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="dir">
      <header class="dir__head">
        <a class="dir__brand" routerLink="/login">
          <span class="dir__mark">M</span>
          <span>PROJECT FORGE</span>
        </a>
        <a class="btn btn--outline btn--sm" routerLink="/login">Sign in</a>
      </header>

      <div class="dir__body">
        <h1 class="dir__title">Find an organisation</h1>
        <p class="dir__sub">
          Search engineering teams that have published a profile. Only the name, description
          and headline figures are shown — project and member details stay private.
        </p>

        <div class="dir__search">
          <app-icon name="search" [size]="18" />
          <input
            class="dir__input"
            [(ngModel)]="term"
            (keyup.enter)="search()"
            placeholder="Organisation name, at least 3 characters…"
            aria-label="Organisation name"
          />
          <button class="btn btn--primary" (click)="search()" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> } @else { Search }
          </button>
        </div>

        @if (error()) { <p class="dir__error">{{ error() }}</p> }

        @if (searched() && !loading() && results().length === 0 && !error()) {
          <p class="dir__empty">
            No published organisation matches that name. Organisations are private by default,
            so many will not appear here.
          </p>
        }

        <div class="dir__grid">
          @for (o of results(); track o.slug) {
            <a class="ocard" [routerLink]="['/organisations', o.slug]">
              <span class="ocard__mark">{{ initials(o.name) }}</span>
              <span class="ocard__name">{{ o.name }}</span>
              @if (o.tagline) { <span class="ocard__tag">{{ o.tagline }}</span> }
              <span class="ocard__stats">
                {{ o.projectCount }} projects · {{ o.memberCount }} members
              </span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './directory.scss',
})
export class DirectorySearchComponent {
  private readonly directory = inject(DirectoryService);

  term = '';
  readonly results = signal<PublicOrganisation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly searched = signal(false);

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  }

  search(): void {
    const q = this.term.trim();
    if (q.length < 3) {
      this.error.set('Enter at least three characters.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.directory.search(q).subscribe({
      next: (organisations) => {
        this.results.set(organisations);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Search failed. Try again.');
        this.loading.set(false);
      },
    });
  }
}
