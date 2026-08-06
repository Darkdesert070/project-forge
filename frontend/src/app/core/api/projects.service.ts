import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { Project, ProjectDetail, ProjectInput } from '../models';

export interface ProjectFilters {
  status?: string;
  search?: string;
  archived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/projects`;

  list(filters: ProjectFilters = {}): Observable<Project[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.archived !== undefined) params = params.set('archived', String(filters.archived));
    return this.http.get<{ projects: Project[] }>(this.base, { params }).pipe(map((r) => r.projects));
  }

  get(id: string): Observable<ProjectDetail> {
    return this.http
      .get<{ project: ProjectDetail }>(`${this.base}/${id}`)
      .pipe(map((r) => r.project));
  }

  create(input: ProjectInput): Observable<ProjectDetail> {
    return this.http
      .post<{ project: ProjectDetail }>(this.base, input)
      .pipe(map((r) => r.project));
  }

  update(id: string, input: ProjectInput): Observable<ProjectDetail> {
    return this.http
      .patch<{ project: ProjectDetail }>(`${this.base}/${id}`, input)
      .pipe(map((r) => r.project));
  }

  archive(id: string): Observable<ProjectDetail> {
    return this.http
      .post<{ project: ProjectDetail }>(`${this.base}/${id}/archive`, {})
      .pipe(map((r) => r.project));
  }

  restore(id: string): Observable<ProjectDetail> {
    return this.http
      .post<{ project: ProjectDetail }>(`${this.base}/${id}/restore`, {})
      .pipe(map((r) => r.project));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
