import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from '../api.config';
import { AuthService } from './auth.service';

/**
 * Endpoints that must not be touched by the auth machinery.
 *
 * The auth routes are exempt because attaching a stale token to a login, or
 * attempting a refresh when a refresh has just failed, produces a confusing
 * loop instead of a clear error.
 *
 * The public organisation directory is exempt because it is genuinely public.
 * Sending an expired token with a request that never needed one turns a
 * working page into a 401, and the retry that follows fails for the same
 * reason. A visitor with no session at all was never affected; a signed-in
 * user with an expired access token was.
 */
const AUTH_EXEMPT = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/organisations',
  '/health',
];

/**
 * Attaches the access token to API requests and transparently refreshes it once
 * on a 401, then retries the original request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(API_BASE);
  const isExempt = AUTH_EXEMPT.some((path) => req.url.startsWith(`${API_BASE}${path}`));

  const withAuth = (token: string | null) => {
    if (!isApi) return req;
    const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;
    return req.clone({ headers, withCredentials: true });
  };

  return next(withAuth(auth.getAccessToken())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !isApi || isExempt) {
        return throwError(() => err);
      }
      return from(auth.refreshToken()).pipe(
        switchMap((token) => next(withAuth(token))),
        catchError(() => throwError(() => err)),
      );
    }),
  );
};
