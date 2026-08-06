import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { API_BASE } from '../api.config';
import type { SessionUser } from '../models';

interface AuthResponse {
  user: SessionUser;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly userSignal = signal<SessionUser | null>(null);
  private accessToken: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private applySession(res: AuthResponse): AuthResponse {
    this.accessToken = res.accessToken;
    this.userSignal.set(res.user);
    return res;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this.applySession(res)));
  }

  register(input: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/register`, input, { withCredentials: true })
      .pipe(tap((res) => this.applySession(res)));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true }),
      );
    } catch {
      // ignore — clear locally regardless
    }
    this.accessToken = null;
    this.userSignal.set(null);
  }

  /** Called on app start: uses the httpOnly refresh cookie to restore a session. */
  async restoreSession(): Promise<void> {
    try {
      await this.refreshToken();
    } catch {
      this.accessToken = null;
      this.userSignal.set(null);
    }
  }

  /** Exchanges the refresh cookie for a new access token. De-duplicates concurrent calls. */
  refreshToken(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = firstValueFrom(
      this.http.post<AuthResponse>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true },
      ),
    )
      .then((res) => {
        this.applySession(res);
        return res.accessToken;
      })
      .catch((err) => {
        this.accessToken = null;
        this.userSignal.set(null);
        throw err;
      })
      .finally(() => {
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }
}
