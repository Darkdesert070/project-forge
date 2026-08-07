import { prisma } from '../lib/prisma';
import { HttpError } from './http-error';
import type { AuthUser } from '../middleware/auth';

/**
 * Every member of a workspace can reach every project in it. Write permission
 * is enforced separately by route middleware and by the archived-project check.
 */
function accessScope(_user: AuthUser) {
  return {};
}

export async function assertProjectAccess(user: AuthUser, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: user.workspaceId, ...accessScope(user) },
    select: { id: true, name: true, archived: true, workspaceId: true },
  });
  if (!project) {
    throw new HttpError(404, 'Project not found');
  }
  return project;
}

export async function assertWritableProject(user: AuthUser, projectId: string) {
  const project = await assertProjectAccess(user, projectId);
  if (project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }
  return project;
}

export async function assertWorkspaceUser(
  workspaceId: string,
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  const found = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { userId: true },
  });
  if (!found) {
    throw new HttpError(400, 'Selected user is not a member of this workspace');
  }
  // The membership row carries userId, not id: callers want the user, not the
  // membership record.
  return found.userId;
}
