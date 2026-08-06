import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  workspaceId: string;
  role: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;

/** Opaque refresh token — random, stored hashed, rotated on every use. */
export const generateRefreshToken = (): string => crypto.randomBytes(48).toString('hex');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
