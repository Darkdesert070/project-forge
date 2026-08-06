import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { Evidence, EvidenceInput } from '../models';

@Injectable({ providedIn: 'root' })
export class EvidenceService {
  private readonly http = inject(HttpClient);

  list(projectId: string): Observable<Evidence[]> {
    return this.http
      .get<{ evidence: Evidence[] }>(`${API_BASE}/projects/${projectId}/evidence`)
      .pipe(map((r) => r.evidence));
  }

  create(projectId: string, input: EvidenceInput): Observable<Evidence> {
    return this.http
      .post<{ evidence: Evidence }>(`${API_BASE}/projects/${projectId}/evidence`, input)
      .pipe(map((r) => r.evidence));
  }

  update(id: string, input: Partial<EvidenceInput>): Observable<Evidence> {
    return this.http
      .patch<{ evidence: Evidence }>(`${API_BASE}/evidence/${id}`, input)
      .pipe(map((r) => r.evidence));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/evidence/${id}`);
  }
}
