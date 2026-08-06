import type { Request, Response } from 'express';
import { env } from '../../config/env';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'forge_rt';
const REFRESH_PATH = '/api/v1/auth';

function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    expires: expiresAt,
    path: REFRESH_PATH,
  });
}

function readRefreshCookie(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE];
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
  res.status(201).json({ user: result.user, accessToken: result.accessToken });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
  res.json({ user: result.user, accessToken: result.accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh(readRefreshCookie(req));
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
  res.json({ user: result.user, accessToken: result.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.currentUser(req.user!.id);
  res.json({ user });
}
