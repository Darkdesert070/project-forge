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
  AnswerClarificationInput,
  CreateClarificationInput,
  ListClarificationsQuery,
  UpdateClarificationInput,
} from './clarifications.schemas';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['ANSWERED'],
  ANSWERED: ['CLOSED'],
  CLOSED: [],
};

function assertTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new HttpError(
      409,
      `A clarification in the ${from} state cannot move to ${to}`,
      { code: 'CLARIFICATION_INVALID_TRANSITION', from, to },
    );
  }
}

export function serializeClarification(c: any) {
  return {
    id: c.id,
    projectId: c.projectId,
    question: c.question,
    answer: c.answer,
    status: c.status,
    priority: c.priority,
    author: c.author ? publicUser(c.author) : null,
    assignee: c.assignee ? publicUser(c.assignee) : null,
    answeredAt: c.answeredAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function findClarification(user: AuthUser, id: string) {
  const clarification = await prisma.clarification.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    include: {
      author: true,
      assignee: true,
      project: { select: { id: true, name: true, archived: true } },
    },
  });
  if (!clarification) {
    throw new HttpError(404, 'Clarification not found');
  }
  await assertProjectAccess(user, clarification.projectId);
  return clarification;
}

export async function listClarifications(
  user: AuthUser,
  projectId: string,
  query: ListClarificationsQuery,
) {
  await assertProjectAccess(user, projectId);
  const where: any = { projectId };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  const clarifications = await prisma.clarification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { author: true, assignee: true },
  });
  return clarifications.map(serializeClarification);
}

export async function createClarification(
  user: AuthUser,
  projectId: string,
  input: CreateClarificationInput,
) {
  const project = await assertWritableProject(user, projectId);
  const assigneeId = await assertWorkspaceUser(user.workspaceId, input.assigneeId);

  const clarification = await prisma.clarification.create({
    data: {
      projectId,
      question: input.question,
      priority: input.priority ?? 'MEDIUM',
      status: 'OPEN',
      authorId: user.id,
      assigneeId,
    },
    include: { author: true, assignee: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId,
    userId: user.id,
    action: 'CLARIFICATION_RAISED',
    entityType: 'Clarification',
    entityId: clarification.id,
    meta: { project: project.name },
  });

  return serializeClarification(clarification);
}

export async function updateClarification(
  user: AuthUser,
  id: string,
  input: UpdateClarificationInput,
) {
  const existing = await findClarification(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }
  if (existing.status === 'CLOSED') {
    throw new HttpError(409, 'A closed clarification cannot be edited', {
      code: 'CLARIFICATION_CLOSED',
    });
  }

  const data: any = {};
  if (input.question !== undefined) data.question = input.question;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.assigneeId !== undefined) {
    data.assigneeId = await assertWorkspaceUser(user.workspaceId, input.assigneeId);
  }

  const clarification = await prisma.clarification.update({
    where: { id },
    data,
    include: { author: true, assignee: true },
  });
  return serializeClarification(clarification);
}

export async function answerClarification(
  user: AuthUser,
  id: string,
  input: AnswerClarificationInput,
) {
  const existing = await findClarification(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }
  assertTransition(existing.status, 'ANSWERED');

  const clarification = await prisma.clarification.update({
    where: { id },
    data: {
      answer: input.answer,
      status: 'ANSWERED',
      answeredAt: new Date(),
    },
    include: { author: true, assignee: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: clarification.projectId,
    userId: user.id,
    action: 'CLARIFICATION_ANSWERED',
    entityType: 'Clarification',
    entityId: clarification.id,
    meta: { project: existing.project.name },
  });

  await notifyWorkspace(user.workspaceId, user.id, {
    type: 'CLARIFICATION_ANSWERED',
    title: 'Clarification answered',
    message: `A clarification in ${existing.project.name} has been answered.`,
    link: `/projects/${clarification.projectId}`,
  });

  return serializeClarification(clarification);
}

export async function closeClarification(user: AuthUser, id: string) {
  const existing = await findClarification(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }
  assertTransition(existing.status, 'CLOSED');

  const clarification = await prisma.clarification.update({
    where: { id },
    data: { status: 'CLOSED' },
    include: { author: true, assignee: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: clarification.projectId,
    userId: user.id,
    action: 'CLARIFICATION_CLOSED',
    entityType: 'Clarification',
    entityId: clarification.id,
    meta: { project: existing.project.name },
  });

  await notifyWorkspace(user.workspaceId, user.id, {
    type: 'CLARIFICATION_CLOSED',
    title: 'Clarification closed',
    message: `A clarification in ${existing.project.name} has been closed.`,
    link: `/projects/${clarification.projectId}`,
  });

  return serializeClarification(clarification);
}

export async function deleteClarification(user: AuthUser, id: string) {
  const existing = await findClarification(user, id);
  if (user.role !== 'ADMIN') {
    throw new HttpError(403, 'Administrator privileges required');
  }
  await prisma.clarification.delete({ where: { id } });
  await logActivity({
    workspaceId: user.workspaceId,
    projectId: existing.projectId,
    userId: user.id,
    action: 'CLARIFICATION_DELETED',
    entityType: 'Clarification',
    entityId: id,
    meta: {},
  });
}
