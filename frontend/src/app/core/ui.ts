import type {
  ClarificationStatus,
  EvidenceType,
  MilestoneStatus,
  Priority,
  ProjectStatus,
  ReviewDecision,
} from './models';

export interface Meta {
  label: string;
  /** Semantic token used to build the badge class, e.g. `badge--success`. */
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';
}

export const PROJECT_STATUS_META: Record<ProjectStatus, Meta> = {
  PLANNING: { label: 'Planning', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'primary' },
  ON_HOLD: { label: 'On Hold', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

export const PRIORITY_META: Record<Priority, Meta> = {
  LOW: { label: 'Low', tone: 'neutral' },
  MEDIUM: { label: 'Medium', tone: 'info' },
  HIGH: { label: 'High', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'danger' },
};

export const MILESTONE_STATUS_META: Record<MilestoneStatus, Meta> = {
  NOT_STARTED: { label: 'Not Started', tone: 'neutral' },
  IN_PROGRESS: { label: 'In Progress', tone: 'primary' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  DELAYED: { label: 'Delayed', tone: 'danger' },
};

export const REVIEW_DECISION_META: Record<ReviewDecision, Meta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  APPROVED_WITH_COMMENTS: { label: 'Approved w/ comments', tone: 'info' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

export const CLARIFICATION_STATUS_META: Record<ClarificationStatus, Meta> = {
  OPEN: { label: 'Open', tone: 'warning' },
  ANSWERED: { label: 'Answered', tone: 'info' },
  CLOSED: { label: 'Closed', tone: 'success' },
};

export const EVIDENCE_TYPE_META: Record<EvidenceType, { label: string; icon: string }> = {
  PDF: { label: 'PDF Report', icon: '📄' },
  CAD: { label: 'CAD Drawing', icon: '📐' },
  SIMULATION: { label: 'Simulation', icon: '🧮' },
  TESTING: { label: 'Test Result', icon: '🧪' },
  LINK: { label: 'Link', icon: '🔗' },
  IMAGE: { label: 'Image', icon: '🖼️' },
  VIDEO: { label: 'Video', icon: '🎬' },
  DOCUMENT: { label: 'Document', icon: '📁' },
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value).getTime();
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  let phrase: string;
  if (mins < 1) return 'just now';
  if (mins < 60) phrase = fmt(mins, 'minute');
  else if (hours < 24) phrase = fmt(hours, 'hour');
  else if (days < 30) phrase = fmt(days, 'day');
  else phrase = formatDate(value);
  if (days >= 30) return phrase;
  return diff < 0 ? `${phrase} ago` : `in ${phrase}`;
}

const ACTIVITY_VERB: Record<string, string> = {
  'project.created': 'created project',
  'project.updated': 'updated project',
  'project.archived': 'archived project',
  'project.restored': 'restored project',
  'project.deleted': 'deleted project',
};

export function activityLabel(action: string): string {
  return ACTIVITY_VERB[action] ?? action.replace(/[._]/g, ' ');
}
