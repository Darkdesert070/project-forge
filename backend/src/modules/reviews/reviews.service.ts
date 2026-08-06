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
import type { CreateReviewInput, ListReviewsQuery, UpdateReviewInput } from './reviews.schemas';

export function serializeReview(r: any) {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    decision: r.decision,
    comments: r.comments,
    reviewDate: r.reviewDate,
    reviewer: r.reviewer ? publicUser(r.reviewer) : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

async function findReview(user: AuthUser, id: string) {
  const review = await prisma.review.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    include: { reviewer: true, project: { select: { id: true, name: true, archived: true } } },
  });
  if (!review) {
    throw new HttpError(404, 'Design review not found');
  }
  await assertProjectAccess(user, review.projectId);
  return review;
}

export async function listReviews(user: AuthUser, projectId: string, query: ListReviewsQuery) {
  await assertProjectAccess(user, projectId);
  const where: any = { projectId };
  if (query.decision) where.decision = query.decision;
  if (query.reviewerId) where.reviewerId = query.reviewerId;

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { reviewDate: 'desc' },
    include: { reviewer: true },
  });
  return reviews.map(serializeReview);
}

export async function createReview(user: AuthUser, projectId: string, input: CreateReviewInput) {
  const project = await assertWritableProject(user, projectId);
  const reviewerId = await assertWorkspaceUser(user.workspaceId, input.reviewerId);

  if (input.decision === 'REJECTED' && !input.comments?.trim()) {
    throw new HttpError(400, 'Comments are required when a review is rejected');
  }

  const review = await prisma.review.create({
    data: {
      projectId,
      title: input.title,
      reviewerId,
      reviewDate: input.reviewDate ?? new Date(),
      decision: input.decision ?? 'PENDING',
      comments: input.comments ?? '',
    },
    include: { reviewer: true },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    projectId,
    userId: user.id,
    action: 'REVIEW_CREATED',
    entityType: 'Review',
    entityId: review.id,
    meta: { title: review.title, project: project.name },
  });

  return serializeReview(review);
}

export async function updateReview(user: AuthUser, id: string, input: UpdateReviewInput) {
  const existing = await findReview(user, id);
  if (existing.project.archived) {
    throw new HttpError(409, 'Project is archived and cannot be modified');
  }

  const nextDecision = input.decision ?? existing.decision;
  const nextComments = input.comments ?? existing.comments;
  if (nextDecision === 'REJECTED' && !nextComments?.trim()) {
    throw new HttpError(400, 'Comments are required when a review is rejected');
  }

  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.comments !== undefined) data.comments = input.comments;
  if (input.reviewDate !== undefined) data.reviewDate = input.reviewDate;
  if (input.reviewerId !== undefined) {
    data.reviewerId = await assertWorkspaceUser(user.workspaceId, input.reviewerId);
  }
  if (input.decision !== undefined) data.decision = input.decision;

  const review = await prisma.review.update({
    where: { id },
    data,
    include: { reviewer: true },
  });

  const decisionRecorded =
    input.decision !== undefined &&
    input.decision !== 'PENDING' &&
    existing.decision !== input.decision;

  await logActivity({
    workspaceId: user.workspaceId,
    projectId: review.projectId,
    userId: user.id,
    action: decisionRecorded ? 'REVIEW_DECIDED' : 'REVIEW_UPDATED',
    entityType: 'Review',
    entityId: review.id,
    meta: { title: review.title, decision: review.decision },
  });

  if (decisionRecorded) {
    await notifyWorkspace(user.workspaceId, user.id, {
      type: 'REVIEW_DECIDED',
      title: 'Design review decision recorded',
      message: `${review.title} was marked ${review.decision.replace(/_/g, ' ').toLowerCase()}.`,
      link: `/projects/${review.projectId}`,
    });
  }

  return serializeReview(review);
}

export async function deleteReview(user: AuthUser, id: string) {
  const existing = await findReview(user, id);
  if (user.role !== 'ADMIN') {
    throw new HttpError(403, 'Administrator privileges required');
  }
  await prisma.review.delete({ where: { id } });
  await logActivity({
    workspaceId: user.workspaceId,
    projectId: existing.projectId,
    userId: user.id,
    action: 'REVIEW_DELETED',
    entityType: 'Review',
    entityId: id,
    meta: { title: existing.title },
  });
}
