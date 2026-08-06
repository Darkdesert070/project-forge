import { z } from 'zod';

export const PROJECT_STATUS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;
export const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/** Accepts '' / null / undefined as "no date"; otherwise coerces to a Date. */
const optionalDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.date().nullable(),
);

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is too short').max(120),
  description: z.string().max(4000).optional().default(''),
  client: z.string().max(120).optional().default(''),
  managerId: z.string().nullable().optional(),
  status: z.enum(PROJECT_STATUS).optional().default('PLANNING'),
  priority: z.enum(PRIORITY).optional().default('MEDIUM'),
  startDate: optionalDate.optional(),
  endDate: optionalDate.optional(),
  progress: z.coerce.number().int().min(0).max(100).optional().default(0),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional().default([]),
  memberIds: z.array(z.string()).max(100).optional().default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsQuerySchema = z.object({
  status: z.enum(PROJECT_STATUS).optional(),
  search: z.string().trim().max(120).optional(),
  archived: z
    .preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
