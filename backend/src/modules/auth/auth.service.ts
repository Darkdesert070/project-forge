import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../utils/http-error';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/jwt';
import { pickAvatarColor } from '../../utils/serializers';
import type { LoginInput, RegisterInput } from './auth.schemas';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  workspaceId: string;
  workspaceName?: string;
}

export interface AuthResult {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/** A user plus the workspace they are currently acting in. */
interface ActiveSession {
  user: any;
  membership: any;
}

function sessionUser({ user, membership }: ActiveSession): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    avatarColor: user.avatarColor,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace?.name,
  };
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'workspace';
}

/**
 * A user may belong to several workspaces. Until workspace switching exists in
 * the interface, the earliest membership is the active one, which keeps the
 * choice stable across sessions.
 */
async function activeMembership(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { workspace: true },
  });
  if (!membership) {
    throw new HttpError(403, 'This account does not belong to any workspace');
  }
  return membership;
}

async function issueRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

async function buildSession(session: ActiveSession): Promise<AuthResult> {
  const accessToken = signAccessToken({
    sub: session.user.id,
    workspaceId: session.membership.workspaceId,
    role: session.membership.role,
  });
  const refresh = await issueRefreshToken(session.user.id);
  return {
    user: sessionUser(session),
    accessToken,
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

/**
 * Registering either joins a workspace the person was invited to, or creates a
 * new workspace with the registrant as its first administrator.
 *
 * An administrator can invite someone before that person has an account. The
 * invitation is matched on email at registration and consumed here, so the new
 * user lands directly in the inviting workspace rather than in one of their own.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const invitations = await prisma.invitation.findMany({
    where: { email: input.email },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });

  const passwordHash = await hashPassword(input.password);

  if (invitations.length > 0) {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        avatarColor: pickAvatarColor(input.name),
        memberships_ws: {
          create: invitations.map((inv: any) => ({
            workspaceId: inv.workspaceId,
            role: inv.role,
          })),
        },
      },
    });
    await prisma.invitation.deleteMany({ where: { email: input.email } });
    const membership = await activeMembership(user.id);
    return buildSession({ user, membership });
  }

  let slug = slugify(input.workspaceName);
  if (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      avatarColor: pickAvatarColor(input.name),
      memberships_ws: {
        create: {
          role: 'ADMIN',
          workspace: { create: { name: input.workspaceName, slug } },
        },
      },
    },
  });

  const membership = await activeMembership(user.id);
  return buildSession({ user, membership });
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const membership = await activeMembership(user.id);
  return buildSession({ user, membership });
}

/** Rotates the presented refresh token: revoke the old, issue a fresh pair. */
export async function refresh(rawToken: string | undefined): Promise<AuthResult> {
  if (!rawToken) {
    throw new HttpError(401, 'Refresh token missing');
  }
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'Refresh token is invalid or expired');
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  const membership = await activeMembership(stored.userId);
  return buildSession({ user: stored.user, membership });
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function currentUser(userId: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  const membership = await activeMembership(userId);
  return sessionUser({ user, membership });
}
