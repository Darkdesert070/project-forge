import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import type { AuthUser } from '../../middleware/auth';
import type { SearchDirectoryQuery, UpdateVisibilityInput } from './directory.schemas';

/** Hard ceiling on results, so a broad term cannot be used to walk the directory. */
const MAX_RESULTS = 10;

/**
 * The public shape of a workspace.
 *
 * This is the complete set of fields any unauthenticated caller can ever see.
 * It carries no project names, no client names, no member names and no member
 * emails — only what an organisation would put on a public profile. Counts are
 * aggregates, so they reveal size without revealing content.
 */
function publicProfile(w: any) {
  return {
    slug: w.slug,
    name: w.name,
    tagline: w.tagline,
    createdAt: w.createdAt,
    projectCount: w._count?.projects ?? 0,
    memberCount: w._count?.memberships ?? 0,
  };
}

const publicSelect = {
  slug: true,
  name: true,
  tagline: true,
  createdAt: true,
  _count: { select: { projects: true, memberships: true } },
};

/**
 * Finds published workspaces by name. Only workspaces whose administrator has
 * explicitly opted in are searchable; every workspace is private on creation.
 */
export async function searchDirectory(query: SearchDirectoryQuery) {
  const workspaces = await prisma.workspace.findMany({
    where: {
      isPublic: true,
      name: { contains: query.q, mode: 'insensitive' },
    },
    select: publicSelect,
    orderBy: { name: 'asc' },
    take: MAX_RESULTS,
  });
  return workspaces.map(publicProfile);
}

export async function getPublicProfile(slug: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { slug, isPublic: true },
    select: publicSelect,
  });
  // A private workspace and a non-existent one are indistinguishable from
  // outside, so opting out cannot be detected.
  if (!workspace) {
    throw new HttpError(404, 'No public profile found for this organisation');
  }
  return publicProfile(workspace);
}

/** The administrator's own view, including whether the profile is published. */
export async function getOwnVisibility(user: AuthUser) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { ...publicSelect, isPublic: true },
  });
  if (!workspace) {
    throw new HttpError(404, 'Workspace not found');
  }
  return { ...publicProfile(workspace), isPublic: workspace.isPublic };
}

export async function updateVisibility(user: AuthUser, input: UpdateVisibilityInput) {
  const workspace = await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: {
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
    },
    select: { ...publicSelect, isPublic: true },
  });
  return { ...publicProfile(workspace), isPublic: workspace.isPublic };
}
