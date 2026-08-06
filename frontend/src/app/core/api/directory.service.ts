import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';

/** The complete public shape of an organisation. Nothing else is exposed. */
export interface PublicOrganisation {
  slug: string;
  name: string;
  tagline: string;
  createdAt: string;
  projectCount: number;
  memberCount: number;
}

export interface OwnVisibility extends PublicOrganisation {
  isPublic: boolean;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/organisations`;
  private readonly own = `${API_BASE}/workspace/visibility`;

  search(q: string): Observable<PublicOrganisation[]> {
    return this.http
      .get<{ organisations: PublicOrganisation[] }>(`${this.base}/search`, { params: { q } })
      .pipe(map((r) => r.organisations));
  }

  profile(slug: string): Observable<PublicOrganisation> {
    return this.http
      .get<{ organisation: PublicOrganisation }>(`${this.base}/${slug}`)
      .pipe(map((r) => r.organisation));
  }

  visibility(): Observable<OwnVisibility> {
    return this.http
      .get<{ organisation: OwnVisibility }>(this.own)
      .pipe(map((r) => r.organisation));
  }

  updateVisibility(input: { isPublic?: boolean; tagline?: string }): Observable<OwnVisibility> {
    return this.http
      .patch<{ organisation: OwnVisibility }>(this.own, input)
      .pipe(map((r) => r.organisation));
  }
}
