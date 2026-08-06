import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { publicUser, safeParseTags } from '../../utils/serializers';
import type { AuthUser } from '../../middleware/auth';
import { logActivity, serializeActivity } from '../activity/activity.service';
import { notifyWorkspace } from '../notifications/notifications.service';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './projects.schemas';

const listInclude = {
  manager: true,
  members: { include: { user: true } },
  milestones: { select: { progress: true, status: true } },
  _count: {
    select: {
      milestones: true,
      reviews: true,
      clarifications: true,
      evidence: true,
      members: true,
    },
  },
} as const;

const detailInclude = {
  manager: true,
  members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
  milestones: { include: { assignee: true }, orderBy: { dueDate: 'asc' } },
  reviews: { include: { reviewer: true }, orderBy: { reviewDate: 'desc' } },
  clarifications: {
    include: { author: true, assignee: true },
    orderBy: { createdAt: 'desc' },
  },
  evidence: { include: { uploader: true }, orderBy: { createdAt: 'desc' } },
  activities: {
    include: { user: true, project: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
  _count: {
    select: {
      milestones: true,
      reviews: true,
      clarifications: true,
      evidence: true,
      members: true,
    },
  },
} as const;

/** Progress is derived from milestone completion, falling back to the stored value. */
function computeProgress(project: any): number {
  const milestones = project.milestones ?? [];
  if (milestones.length === 0) return project.progress ?? 0;
  const total = milestones.reduce((sum: number, m: any) => sum + (m.progress ?? 0), 0);
  return Math.round(total / milestones.length);
}

function serializeProject(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    client: p.client,
    status: p.status,
    priority: p.priority,
    startDate: p.startDate,
    endDate: p.endDate,
    progress: computeProgress(p),
    tags: safeParseTags(p.tags),
    archived: p.archived,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    manager: p.manager ? publicUser(p.manager) : null,
    members: (p.members ?? []).map((m: any) => publicUser(m.user)),
    counts: p._count
      ? {
          milestones: p._count.milestones,
          reviews: p._count.reviews,
          clarifications: p._count.clarifications,
          evidence: p._count.evidence,
          members: p._count.members,
        }
      : undefined,
  };
}

function serializeMilestone(m: any) {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate,
    progress: m.progress,
    status: m.status,
    priority: m.priority,
    assignee: m.assignee ? publicUser(m.assignee) : null,
    createdAt: m.createdAt,
  };
}

function serializeReview(r: any) {
  return {
    id: r.id,
    title: r.title,
    decision: r.decision,
    comments: r.comments,
    reviewDate: r.reviewDate,
    reviewer: r.reviewer ? publicUser(r.reviewer) : null,
    createdAt: r.createdAt,
  };
}

function serializeClarification(c: any) {
  return {
    id: c.id,
    question: c.question,
    answer: c.answer,
    status: c.status,
    priority: c.priority,
    author: c.author ? publicUser(c.author) : null,
    assignee: c.assignee ? publicUser(c.assignee) : null,
    answeredAt: c.answeredAt,
    createdAt: c.createdAt,
  };
}

function serializeEvidence(e: any) {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    url: e.url,
    description: e.description,
    uploader: e.uploader ? publicUser(e.uploader) : null,
    createdAt: e.createdAt,
  };
}

function serializeProjectDetail(p: any) {
  return {
    ...serializeProject(p),
    milestones: (p.milestones ?? []).map(serializeMilestone),
    reviews: (p.reviews ?? []).map(serializeReview),
    clarifications: (p.clarifications ?? []).map(serializeClarification),
    evidence: (p.evidence ?? []).map(serializeEvidence),
    activity: (p.activities ?? []).map(serializeActivity),
  };
}

/**
 * Every member of a workspace can see every project in it. Visibility and
 * authority are separate concerns here: creating, editing, archiving and
 * deleting a project remain restricted to administrators by the route
 * middleware, so widening visibility does not widen what anyone may do.
 */
function accessScope(_user: AuthUser) {
  return {};
}

async function validWorkspaceUserIds(workspaceId: string, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const memberships = await prisma.membership.findMany({
    where: { workspaceId, userId: { in: unique } },
    select: { userId: true },
  });
  return memberships.map((m: any) => m.userId);
}

export async function listProjects(user: AuthUser, query: ListProjectsQuery) {
  const where: any = {
    workspaceId: user.workspaceId,
    archived: query.archived ?? false,
    ...accessScope(user),
  };
  if (query.status) where.status = query.status;

  // One search box across the fields a person is likely to remember: the
  // project name, the client it belongs to, its tags and its description.
  // Case-insensitive, because nobody recalls how a client name was capitalised.
  // Safe to assign OR directly here only because accessScope no longer returns
  // one; if it ever does again, both must be combined under AND.
  if (query.search) {
    const term = query.search;
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { client: { contains: term, mode: 'insensitive' } },
      { tags: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: listInclude,
  });
  return projects.map(serializeProject);
}

async function findAccessibleProject(user: AuthUser, id: string, include?: any) {
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: user.workspaceId, ...accessScope(user) },
    ...(include ? { include } : {}),
  });
  if (!project) {
    throw new HttpError(404, 'Project not found');
  }
  return project;
}

export async function getProject(user: AuthUser, id: string) {
  const project = await findAccessibleProject(user, id, detailInclude);
  return serializeProjectDetail(project);
}

export async function createProject(user: AuthUser, input: CreateProjectInput) {
  const memberIds = await validWorkspaceUserIds(user.workspaceId, input.memberIds ?? []);
  let managerId: string | null = null;
  if (input.managerId) {
    const [valid] = await validWorkspaceUserIds(user.workspaceId, [input.managerId]);
    managerId = valid ?? null;
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: user.workspaceId,
      name: input.name,
      description: input.description ?? '',
      client: input.client ?? '',
      managerId,
      status: input.status ?? 'PLANNING',
      priority: input.priority ?? 'MEDIUM',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      progress: input.progress ?? 0,
      tags: JSON.stringify(input.tags ?? []),
      members: memberIds.length
        ? { create: memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: detailInclude,
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: project.id,
    userId: user.id,
    action: 'project.created',
    entityType: 'project',
    entityId: project.id,
    meta: { name: project.name },
  });
  await notifyWorkspace(user.workspaceId, user.id, {
    type: 'PROJECT_CREATED',
    title: 'New project created',
    message: `${project.name} was added to the workspace`,
    link: `/projects/${project.id}`,
  });

  return serializeProjectDetail(project);
}

export async function updateProject(user: AuthUser, id: string, input: UpdateProjectInput) {
  await findAccessibleProject(user, id, { members: true });

  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.client !== undefined) data.client = input.client;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.progress !== undefined) data.progress = input.progress;
  if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);

  if (input.managerId !== undefined) {
    if (input.managerId) {
      const [valid] = await validWorkspaceUserIds(user.workspaceId, [input.managerId]);
      data.managerId = valid ?? null;
    } else {
      data.managerId = null;
    }
  }

  if (input.memberIds !== undefined) {
    const memberIds = await validWorkspaceUserIds(user.workspaceId, input.memberIds);
    data.members = {
      deleteMany: {},
      create: memberIds.map((userId) => ({ userId })),
    };
  }

  const project = await prisma.project.update({
    where: { id },
    data,
    include: detailInclude,
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: project.id,
    userId: user.id,
    action: 'project.updated',
    entityType: 'project',
    entityId: project.id,
    meta: { name: project.name },
  });

  return serializeProjectDetail(project);
}

export async function setArchived(user: AuthUser, id: string, archived: boolean) {
  await findAccessibleProject(user, id);
  const project = await prisma.project.update({
    where: { id },
    data: { archived, status: archived ? 'ARCHIVED' : 'PLANNING' },
    include: detailInclude,
  });
  await logActivity({
    workspaceId: user.workspaceId,
    projectId: project.id,
    userId: user.id,
    action: archived ? 'project.archived' : 'project.restored',
    entityType: 'project',
    entityId: project.id,
    meta: { name: project.name },
  });
  return serializeProjectDetail(project);
}

export async function deleteProject(user: AuthUser, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new HttpError(404, 'Project not found');
  }
  await prisma.project.delete({ where: { id } });
  await logActivity({
    workspaceId: user.workspaceId,
    userId: user.id,
    action: 'project.deleted',
    entityType: 'project',
    entityId: project.id,
    meta: { name: project.name },
  });
}
