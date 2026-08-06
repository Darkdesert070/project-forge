import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { Review, ReviewInput } from '../models';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);

  list(projectId: string): Observable<Review[]> {
    return this.http
      .get<{ reviews: Review[] }>(`${API_BASE}/projects/${projectId}/reviews`)
      .pipe(map((r) => r.reviews));
  }

  create(projectId: string, input: ReviewInput): Observable<Review> {
    return this.http
      .post<{ review: Review }>(`${API_BASE}/projects/${projectId}/reviews`, input)
      .pipe(map((r) => r.review));
  }

  update(id: string, input: Partial<ReviewInput>): Observable<Review> {
    return this.http
      .patch<{ review: Review }>(`${API_BASE}/reviews/${id}`, input)
      .pipe(map((r) => r.review));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/reviews/${id}`);
  }
}
