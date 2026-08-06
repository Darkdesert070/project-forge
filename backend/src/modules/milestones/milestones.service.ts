import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { publicUser } from '../../utils/serializers';
import {
  assertProjectAccess,
  assertWorkspaceUser,
  assertWritableProject,
} from '../../utils/project-access';
import type { AuthUser } from '../../middleware/auth';
import { logActivity } from '../activity/activity.service';
import { notifyWorkspace } from '../notifications/notifications.service';
import type {
  CreateMilestoneInput,
  ListMilestonesQuery,
  UpdateMilestoneInput,
} from './milestones.schemas';

function isOverdue(m: any): boolean {
  if (!m.dueDate || m.status === 'COMPLETED') return false;
  return new Date(m.dueDate).getTime() < Date.now();
}

export function serializeMilestone(m: any) {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate,
    progress: m.progress,
    status: m.status,
    priority: m.priority,
    overdue: isOverdue(m),
    assignee: m.assignee ? publicUser(m.assignee) : null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

async function findMilestone(user: AuthUser, id: string) {
  const milestone = await prisma.milestone.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    include: { assignee: true, project: { select: { id: true, name: true, archived: true } } },
  });
  if (!milestone) {
    throw new HttpError(404, 'Milestone not found');
  }
  await assertProjectAccess(user, milestone.projectId);
  return milestone;
}

export async function listMilestones(
  user: AuthUser,
  projectId: string,
  query: ListMilestonesQuery,
) {
  await assertProjectAccess(user, projectId);
  const where: any = { projectId };
  if (query.status) where.status = query.status;
  if (query.assigneeId) where.assigneeId = query.assigneeId;

  const milestones = await prisma.milestone.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    include: { assignee: true },
  });
  return milestones.map(serializeMilestone);
}

export async function createMilestone(
  user: AuthUser,
  projectId: string,
  input: CreateMilestoneInput,
) {
  const project = await assertWritableProject(user, projectId);
  const assigneeId = await assertWorkspaceUser(user.workspaceId, input.assigneeId);

  const milestone = await prisma.milestone.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ?? null,
      progress: input.progress ?? 0,
      status: input.status ?? 'NOT_STARTED',
      priority: input.priority ?? 'MEDIUM',
      assigneeId,
    },
    include: { assignee: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId,
    userId: user.id,
    action: 'MILESTONE_CREATED',
    entityType: 'Milestone',
    entityId: milestone.id,
    meta: { title: milestone.title, project: project.name },
  });

  return serializeMilestone(milestone);
}

export async function updateMilestone(user: AuthUser, id: string, input: UpdateMilestoneInput) {
  const existing = await findMilestone(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }

  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.progress !== undefined) data.progress = input.progress;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.assigneeId !== undefined) {
    data.assigneeId = await assertWorkspaceUser(user.workspaceId, input.assigneeId);
  }

  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'COMPLETED') {
      data.progress = input.progress ?? 100;
    }
  }
  if (data.progress === 100 && data.status === undefined && existing.status !== 'COMPLETED') {
    data.status = 'COMPLETED';
  }

  const milestone = await prisma.milestone.update({
    where: { id },
    data,
    include: { assignee: true },
  });

  const justCompleted = existing.status !== 'COMPLETED' && milestone.status === 'COMPLETED';

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: milestone.projectId,
    userId: user.id,
    action: justCompleted ? 'MILESTONE_COMPLETED' : 'MILESTONE_UPDATED',
    entityType: 'Milestone',
    entityId: milestone.id,
    meta: { title: milestone.title },
  });

  if (justCompleted) {
    await notifyWorkspace(user.workspaceId, user.id, {
      type: 'MILESTONE_COMPLETED',
      title: 'Milestone completed',
      message: `${milestone.title} was marked complete in ${existing.project.name}.`,
      link: `/projects/${milestone.projectId}`,
    });
  }

  return serializeMilestone(milestone);
}

export async function deleteMilestone(user: AuthUser, id: string) {
  const existing = await findMilestone(user, id);
  if (user.role !== 'ADMIN') {
    throw new HttpError(403, 'Administrator privileges required');
  }
  await prisma.milestone.delete({ where: { id } });
  await logActivity({
    workspaceId: user.workspaceId,
    projectId: existing.projectId,
    userId: user.id,
    action: 'MILESTONE_DELETED',
    entityType: 'Milestone',
    entityId: id,
    meta: { title: existing.title },
  });
}
