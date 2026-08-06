import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { hashPassword } from '../../utils/password';
import { pickAvatarColor } from '../../utils/serializers';
import type { AuthUser } from '../../middleware/auth';
import { logActivity } from '../activity/activity.service';
import { notifyWorkspace } from '../notifications/notifications.service';
import type { CreateMemberInput, UpdateMemberInput } from './users.schemas';

function memberDto(membership: any) {
  const u = membership.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: membership.role,
    avatarColor: u.avatarColor,
    createdAt: membership.createdAt,
    status: 'ACTIVE' as const,
  };
}

function invitationDto(inv: any) {
  return {
    id: inv.id,
    name: inv.name,
    email: inv.email,
    role: inv.role,
    avatarColor: pickAvatarColor(inv.name),
    createdAt: inv.createdAt,
    status: 'PENDING' as const,
  };
}

/**
 * Returns joined members and outstanding invitations together, so the interface
 * can show an administrator everyone they have added regardless of whether that
 * person has registered yet.
 */
export async function listMembers(workspaceId: string) {
  const [memberships, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.invitation.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
  ]);
  return [...memberships.map(memberDto), ...invitations.map(invitationDto)];
}

/**
 * Adds someone to the workspace by email.
 *
 * If they already have an account they are joined immediately. If they do not,
 * an invitation is recorded and consumed automatically when they register with
 * the same address. No password is set by the administrator in either case:
 * people choose their own credentials.
 */
export async function createMember(actor: AuthUser, input: CreateMemberInput) {
  const role = input.role ?? 'MEMBER';
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    const already = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId: actor.workspaceId } },
    });
    if (already) {
      throw new HttpError(409, 'This person is already a member of this workspace');
    }

    const membership = await prisma.membership.create({
      data: { userId: existingUser.id, workspaceId: actor.workspaceId, role },
      include: { user: true },
    });

    await logActivity({
      workspaceId: actor.workspaceId,
      userId: actor.id,
      action: 'member.added',
      entityType: 'user',
      entityId: existingUser.id,
      meta: { name: existingUser.name, role },
    });

    await notifyWorkspace(actor.workspaceId, actor.id, {
      type: 'MEMBER_ADDED',
      title: 'New member',
      message: `${existingUser.name} joined the workspace.`,
      link: '/team',
    });

    return memberDto(membership);
  }

  const pending = await prisma.invitation.findUnique({
    where: { workspaceId_email: { workspaceId: actor.workspaceId, email: input.email } },
  });
  if (pending) {
    throw new HttpError(409, 'This person has already been invited and has not yet registered');
  }

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId: actor.workspaceId,
      email: input.email,
      name: input.name,
      role,
    },
  });

  await logActivity({
    workspaceId: actor.workspaceId,
    userId: actor.id,
    action: 'member.invited',
    entityType: 'invitation',
    entityId: invitation.id,
    meta: { name: input.name, email: input.email, role },
  });

  return invitationDto(invitation);
}

/** Loads a membership, guaranteeing it belongs to the actor's workspace. */
async function findMembership(workspaceId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { user: true },
  });
  if (!membership) {
    throw new HttpError(404, 'User not found');
  }
  return membership;
}

async function countAdmins(workspaceId: string): Promise<number> {
  return prisma.membership.count({ where: { workspaceId, role: 'ADMIN' } });
}

export async function updateMember(actor: AuthUser, id: string, input: UpdateMemberInput) {
  const membership = await findMembership(actor.workspaceId, id);

  // Prevent demoting the final admin, which would lock the workspace out of
  // every administrative action with no way back.
  if (
    input.role === 'MEMBER' &&
    membership.role === 'ADMIN' &&
    (await countAdmins(actor.workspaceId)) <= 1
  ) {
    throw new HttpError(400, 'You cannot demote the only administrator');
  }

  if (input.role !== undefined) {
    await prisma.membership.update({
      where: { userId_workspaceId: { userId: id, workspaceId: actor.workspaceId } },
      data: { role: input.role },
    });
  }
  if (input.name !== undefined) {
    await prisma.user.update({ where: { id }, data: { name: input.name } });
  }

  return memberDto(await findMembership(actor.workspaceId, id));
}

export async function resetPassword(actor: AuthUser, id: string, password: string) {
  await findMembership(actor.workspaceId, id);
  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  // Revoke existing sessions so the new password takes effect everywhere.
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Removes someone from this workspace. The account itself is not deleted,
 * because the person may belong to other workspaces and their authored records
 * must survive.
 */
export async function removeMember(actor: AuthUser, id: string) {
  if (id === actor.id) {
    throw new HttpError(400, 'You cannot remove your own account');
  }
  const membership = await findMembership(actor.workspaceId, id);

  if (membership.role === 'ADMIN' && (await countAdmins(actor.workspaceId)) <= 1) {
    throw new HttpError(400, 'You cannot remove the only administrator');
  }

  await prisma.membership.delete({
    where: { userId_workspaceId: { userId: id, workspaceId: actor.workspaceId } },
  });
  await prisma.projectMember.deleteMany({
    where: { userId: id, project: { workspaceId: actor.workspaceId } },
  });

  await logActivity({
    workspaceId: actor.workspaceId,
    userId: actor.id,
    action: 'member.removed',
    entityType: 'user',
    entityId: id,
    meta: { name: membership.user.name },
  });
}

/** Withdraws an invitation that has not yet been accepted. */
export async function removeInvitation(actor: AuthUser, id: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, workspaceId: actor.workspaceId },
  });
  if (!invitation) {
    throw new HttpError(404, 'Invitation not found');
  }
  await prisma.invitation.delete({ where: { id } });
  await logActivity({
    workspaceId: actor.workspaceId,
    userId: actor.id,
    action: 'member.invite_withdrawn',
    entityType: 'invitation',
    entityId: id,
    meta: { email: invitation.email },
  });
}
