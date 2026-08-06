import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { Milestone, MilestoneInput } from '../models';

@Injectable({ providedIn: 'root' })
export class MilestonesService {
  private readonly http = inject(HttpClient);

  list(projectId: string): Observable<Milestone[]> {
    return this.http
      .get<{ milestones: Milestone[] }>(`${API_BASE}/projects/${projectId}/milestones`)
      .pipe(map((r) => r.milestones));
  }

  create(projectId: string, input: MilestoneInput): Observable<Milestone> {
    return this.http
      .post<{ milestone: Milestone }>(`${API_BASE}/projects/${projectId}/milestones`, input)
      .pipe(map((r) => r.milestone));
  }

  update(id: string, input: Partial<MilestoneInput>): Observable<Milestone> {
    return this.http
      .patch<{ milestone: Milestone }>(`${API_BASE}/milestones/${id}`, input)
      .pipe(map((r) => r.milestone));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/milestones/${id}`);
  }
}
