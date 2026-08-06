import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { HttpError } from '../utils/http-error';

export interface AuthUser {
  id: string;
  workspaceId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Requires a valid Bearer access token; attaches the decoded user to req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required');
  }
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, workspaceId: payload.workspaceId, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

/** Must run after requireAuth. Blocks non-admins. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    throw new HttpError(403, 'Administrator privileges required');
  }
  next();
}
