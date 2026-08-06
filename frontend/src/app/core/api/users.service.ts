import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../api.config';
import type { CreateMemberInput, Member, PublicUser, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/users`;

  /**
   * Lightweight list used for assignment dropdowns. Invited people who have not
   * registered are filtered out: they cannot yet own or be assigned anything.
   */
  list(): Observable<PublicUser[]> {
    return this.http
      .get<{ members: Member[] }>(this.base)
      .pipe(map((r) => r.members.filter((m) => m.status === 'ACTIVE')));
  }

  /** Full roster for the Team page, including outstanding invitations. */
  listMembers(): Observable<Member[]> {
    return this.http.get<{ members: Member[] }>(this.base).pipe(map((r) => r.members));
  }

  create(input: CreateMemberInput): Observable<Member> {
    return this.http.post<{ member: Member }>(this.base, input).pipe(map((r) => r.member));
  }

  updateRole(id: string, role: Role): Observable<Member> {
    return this.http
      .patch<{ member: Member }>(`${this.base}/${id}`, { role })
      .pipe(map((r) => r.member));
  }

  /** Withdraws an invitation that has not been accepted. */
  removeInvitation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invitations/${id}`);
  }

  resetPassword(id: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reset-password`, { password });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
