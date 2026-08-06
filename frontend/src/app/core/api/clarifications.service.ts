import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { Clarification, ClarificationInput } from '../models';

@Injectable({ providedIn: 'root' })
export class ClarificationsService {
  private readonly http = inject(HttpClient);

  list(projectId: string): Observable<Clarification[]> {
    return this.http
      .get<{ clarifications: Clarification[] }>(`${API_BASE}/projects/${projectId}/clarifications`)
      .pipe(map((r) => r.clarifications));
  }

  create(projectId: string, input: ClarificationInput): Observable<Clarification> {
    return this.http
      .post<{ clarification: Clarification }>(
        `${API_BASE}/projects/${projectId}/clarifications`,
        input,
      )
      .pipe(map((r) => r.clarification));
  }

  /** OPEN -> ANSWERED. The server rejects any other source state with 409. */
  answer(id: string, answer: string): Observable<Clarification> {
    return this.http
      .post<{ clarification: Clarification }>(`${API_BASE}/clarifications/${id}/answer`, { answer })
      .pipe(map((r) => r.clarification));
  }

  /** ANSWERED -> CLOSED. The server rejects any other source state with 409. */
  close(id: string): Observable<Clarification> {
    return this.http
      .post<{ clarification: Clarification }>(`${API_BASE}/clarifications/${id}/close`, {})
      .pipe(map((r) => r.clarification));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/clarifications/${id}`);
  }
}
