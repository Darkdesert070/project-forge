export type Role = 'ADMIN' | 'MEMBER';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
export type ReviewDecision = 'PENDING' | 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED';
export type ClarificationStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type EvidenceType =
  | 'PDF'
  | 'CAD'
  | 'SIMULATION'
  | 'TESTING'
  | 'LINK'
  | 'IMAGE'
  | 'VIDEO'
  | 'DOCUMENT';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  workspaceId: string;
  workspaceName?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

/**
 * PENDING covers someone an administrator has added by email who has not
 * registered yet. Their id is the invitation id, not a user id.
 */
export type MemberStatus = 'ACTIVE' | 'PENDING';

export interface Member extends PublicUser {
  createdAt: string;
  status: MemberStatus;
}

export interface CreateMemberInput {
  name: string;
  email: string;
  role: Role;
}

export interface ProjectCounts {
  milestones: number;
  reviews: number;
  clarifications: number;
  evidence: number;
  members: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  manager: PublicUser | null;
  members: PublicUser[];
  counts?: ProjectCounts;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  progress: number;
  status: MilestoneStatus;
  priority: Priority;
  assignee: PublicUser | null;
  createdAt: string;
}

export interface Review {
  id: string;
  title: string;
  decision: ReviewDecision;
  comments: string;
  reviewDate: string;
  reviewer: PublicUser | null;
  createdAt: string;
}

export interface Clarification {
  id: string;
  question: string;
  answer: string;
  status: ClarificationStatus;
  priority: Priority;
  author: PublicUser | null;
  assignee: PublicUser | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceType;
  url: string;
  description: string;
  uploader: PublicUser | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: string;
  user: PublicUser | null;
  project: { id: string; name: string } | null;
}

export interface ProjectDetail extends Project {
  milestones: Milestone[];
  reviews: Review[];
  clarifications: Clarification[];
  evidence: Evidence[];
  activity: ActivityEntry[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    milestoneProgress: number;
    pendingReviews: number;
    openClarifications: number;
  };
  charts: {
    projectsByStatus: { status: ProjectStatus; count: number }[];
    milestonesByStatus: { status: MilestoneStatus; count: number }[];
  };
  upcomingDeadlines: {
    id: string;
    title: string;
    dueDate: string | null;
    status: MilestoneStatus;
    priority: Priority;
    overdue: boolean;
    project: { id: string; name: string } | null;
    assignee: PublicUser | null;
  }[];
  recentActivity: ActivityEntry[];
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface MilestoneInput {
  title: string;
  description?: string;
  dueDate?: string | null;
  progress?: number;
  status?: MilestoneStatus;
  priority?: Priority;
  assigneeId?: string | null;
}

export interface ReviewInput {
  title: string;
  reviewerId?: string | null;
  reviewDate?: string;
  decision?: ReviewDecision;
  comments?: string;
}

export interface ClarificationInput {
  question: string;
  priority?: Priority;
  assigneeId?: string | null;
}

export interface EvidenceInput {
  title: string;
  type?: EvidenceType;
  url: string;
  description?: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
  client?: string;
  managerId?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  tags?: string[];
  memberIds?: string[];
}
