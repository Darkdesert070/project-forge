import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { publicUser } from '../../utils/serializers';
import { assertProjectAccess, assertWritableProject } from '../../utils/project-access';
import type { AuthUser } from '../../middleware/auth';
import { logActivity } from '../activity/activity.service';
import type {
  CreateEvidenceInput,
  ListEvidenceQuery,
  UpdateEvidenceInput,
} from './evidence.schemas';

export function serializeEvidence(e: any) {
  return {
    id: e.id,
    projectId: e.projectId,
    title: e.title,
    type: e.type,
    url: e.url,
    description: e.description,
    uploader: e.uploader ? publicUser(e.uploader) : null,
    createdAt: e.createdAt,
  };
}

async function findEvidence(user: AuthUser, id: string) {
  const evidence = await prisma.evidence.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    include: { uploader: true, project: { select: { id: true, name: true, archived: true } } },
  });
  if (!evidence) {
    throw new HttpError(404, 'Evidence not found');
  }
  await assertProjectAccess(user, evidence.projectId);
  return evidence;
}

export async function listEvidence(user: AuthUser, projectId: string, query: ListEvidenceQuery) {
  await assertProjectAccess(user, projectId);
  const where: any = { projectId };
  if (query.type) where.type = query.type;

  const evidence = await prisma.evidence.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { uploader: true },
  });
  return evidence.map(serializeEvidence);
}

export async function createEvidence(
  user: AuthUser,
  projectId: string,
  input: CreateEvidenceInput,
) {
  const project = await assertWritableProject(user, projectId);

  const evidence = await prisma.evidence.create({
    data: {
      projectId,
      title: input.title,
      type: input.type ?? 'LINK',
      url: input.url,
      description: input.description ?? '',
      uploaderId: user.id,
    },
    include: { uploader: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId,
    userId: user.id,
    action: 'EVIDENCE_ADDED',
    entityType: 'Evidence',
    entityId: evidence.id,
    meta: { title: evidence.title, project: project.name },
  });

  return serializeEvidence(evidence);
}

export async function updateEvidence(user: AuthUser, id: string, input: UpdateEvidenceInput) {
  const existing = await findEvidence(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }
  if (user.role !== 'ADMIN' && existing.uploaderId !== user.id) {
    throw new HttpError(403, 'Only the uploader or an administrator can edit this evidence');
  }

  const evidence = await prisma.evidence.update({
    where: { id },
    data: input,
    include: { uploader: true },
  });
  return serializeEvidence(evidence);
}

export async function deleteEvidence(user: AuthUser, id: string) {
  const existing = await findEvidence(user, id);
  if (user.role !== 'ADMIN') {
    throw new HttpError(403, 'Administrator privileges required');
  }
  await prisma.evidence.delete({ where: { id } });
  await logActivity({
    workspaceId: user.workspaceId,
    projectId: existing.projectId,
    userId: user.id,
    action: 'EVIDENCE_DELETED',
    entityType: 'Evidence',
    entityId: id,
    meta: { title: existing.title },
  });
}
