import { prisma } from '../../lib/prisma';

export interface NotificationPayload {
  type: string;
  title: string;
  message?: string;
  link?: string;
}

/** Fan a notification out to every workspace member (optionally excluding the actor). */
export async function notifyWorkspace(
  workspaceId: string,
  excludeUserId: string | null,
  payload: NotificationPayload,
): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: {
      workspaceId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });
  if (memberships.length === 0) return;

  await prisma.notification.createMany({
    data: memberships.map((m: any) => ({
      workspaceId,
      userId: m.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? '',
      link: payload.link ?? '',
    })),
  });
}

export function serializeNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt,
  };
}

export async function listUserNotifications(userId: string, limit = 15) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return notifications.map(serializeNotification);
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
