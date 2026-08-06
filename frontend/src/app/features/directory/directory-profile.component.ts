import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DirectoryService, type PublicOrganisation } from '../../core/api/directory.service';

/**
 * Public profile for one organisation.
 *
 * A private workspace and one that does not exist both return 404, so opting
 * out of the directory cannot be detected from outside.
 */
@Component({
  selector: 'app-directory-profile',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="dir">
      <header class="dir__head">
        <a class="dir__brand" routerLink="/organisations">
          <span class="dir__mark">M</span>
          <span>PROJECT FORGE</span>
        </a>
        <a class="btn btn--outline btn--sm" routerLink="/login">Sign in</a>
      </header>

      <div class="dir__body">
        @if (loading()) {
          <p class="dir__empty">Loading…</p>
        } @else if (error()) {
          <div class="dir__notfound">
            <h1 class="dir__title">Not found</h1>
            <p class="dir__sub">{{ error() }}</p>
            <a class="btn btn--primary" routerLink="/organisations">Back to search</a>
          </div>
        } @else if (org(); as o) {
          <div class="oprofile">
            <span class="oprofile__mark">{{ initials(o.name) }}</span>
            <h1 class="oprofile__name">{{ o.name }}</h1>
            @if (o.tagline) { <p class="oprofile__tag">{{ o.tagline }}</p> }

            <div class="oprofile__stats">
              <div class="ostat">
                <span class="ostat__value">{{ o.projectCount }}</span>
                <span class="ostat__label">Projects</span>
              </div>
              <div class="ostat">
                <span class="ostat__value">{{ o.memberCount }}</span>
                <span class="ostat__label">Members</span>
              </div>
              <div class="ostat">
                <span class="ostat__value">{{ o.createdAt | date: 'MMM y' }}</span>
                <span class="ostat__label">On Forge since</span>
              </div>
            </div>

            <p class="oprofile__note">
              Project and member details are private to this organisation.
            </p>
            <a class="btn btn--outline" routerLink="/organisations">Search again</a>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './directory.scss',
})
export class DirectoryProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly directory = inject(DirectoryService);

  readonly org = signal<PublicOrganisation | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.directory.profile(slug).subscribe({
      next: (o) => {
        this.org.set(o);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'No public profile found for this organisation.');
        this.loading.set(false);
      },
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  }
}
