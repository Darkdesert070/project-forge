import { prisma } from '../../lib/prisma';
import { publicUser, safeParseTags } from '../../utils/serializers';

export interface ActivityInput {
  workspaceId: string;
  projectId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export async function logActivity(input: ActivityInput): Promise<void> {
  await prisma.activity.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? '',
      entityId: input.entityId ?? '',
      meta: JSON.stringify(input.meta ?? {}),
    },
  });
}

export function serializeActivity(a: any) {
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(a.meta ?? '{}');
  } catch {
    meta = {};
  }
  return {
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    meta,
    createdAt: a.createdAt,
    user: a.user ? publicUser(a.user) : null,
    project: a.project ? { id: a.project.id, name: a.project.name } : null,
  };
}

export async function listWorkspaceActivity(workspaceId: string, limit = 12) {
  const activities = await prisma.activity.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: true, project: { select: { id: true, name: true } } },
  });
  return activities.map(serializeActivity);
}

// Re-exported so seed/scripts can reuse the tag helper without a deep import.
export { safeParseTags };
