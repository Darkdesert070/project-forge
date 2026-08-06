import { prisma } from '../../lib/prisma';
import { publicUser } from '../../utils/serializers';
import type { AuthUser } from '../../middleware/auth';
import { listWorkspaceActivity } from '../activity/activity.service';
import { countUnread, listUserNotifications } from '../notifications/notifications.service';

/** Dashboard figures cover the whole workspace, matching project visibility. */
function accessScope(_user: AuthUser) {
  return {};
}

const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'] as const;
const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;

export async function getDashboard(user: AuthUser) {
  const workspaceId = user.workspaceId;

  const projects = await prisma.project.findMany({
    where: { workspaceId, archived: false, ...accessScope(user) },
    include: {
      manager: true,
      milestones: { select: { progress: true, status: true } },
      _count: { select: { milestones: true } },
    },
  });

  const projectIds = projects.map((p) => p.id);

  // Milestone progress across every accessible project.
  const allMilestones = projects.flatMap((p) => p.milestones);
  const milestoneProgress = allMilestones.length
    ? Math.round(
        allMilestones.reduce((sum, m) => sum + (m.progress ?? 0), 0) / allMilestones.length,
      )
    : 0;

  const milestonesByStatus = MILESTONE_STATUSES.map((status) => ({
    status,
    count: allMilestones.filter((m) => m.status === status).length,
  }));

  const projectsByStatus = PROJECT_STATUSES.map((status) => ({
    status,
    count: projects.filter((p) => p.status === status).length,
  }));

  const [pendingReviews, openClarifications] = await Promise.all([
    projectIds.length
      ? prisma.review.count({ where: { projectId: { in: projectIds }, decision: 'PENDING' } })
      : Promise.resolve(0),
    projectIds.length
      ? prisma.clarification.count({ where: { projectId: { in: projectIds }, status: 'OPEN' } })
      : Promise.resolve(0),
  ]);

  // Upcoming deadlines: open milestones with a due date, soonest first.
  const upcomingMilestones = projectIds.length
    ? await prisma.milestone.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: { not: null },
          status: { not: 'COMPLETED' },
        },
        orderBy: { dueDate: 'asc' },
        take: 6,
        include: { project: { select: { id: true, name: true } }, assignee: true },
      })
    : [];

  const now = Date.now();
  const upcomingDeadlines = upcomingMilestones.map((m) => ({
    id: m.id,
    title: m.title,
    dueDate: m.dueDate,
    status: m.status,
    priority: m.priority,
    overdue: m.dueDate ? m.dueDate.getTime() < now : false,
    project: m.project,
    assignee: m.assignee ? publicUser(m.assignee) : null,
  }));

  const [recentActivity, notifications, unreadCount] = await Promise.all([
    listWorkspaceActivity(workspaceId, 10),
    listUserNotifications(user.id, 8),
    countUnread(user.id),
  ]);

  return {
    stats: {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
      completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
      milestoneProgress,
      pendingReviews,
      openClarifications,
    },
    charts: {
      projectsByStatus,
      milestonesByStatus,
    },
    upcomingDeadlines,
    recentActivity,
    notifications,
    unreadCount,
  };
}
