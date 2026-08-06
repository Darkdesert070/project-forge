import { z } from 'zod';

export const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().trim().max(2000).optional().default(''),
  dueDate: z.coerce.date().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional().default(0),
  status: z.enum(MILESTONE_STATUSES).optional().default('NOT_STARTED'),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

export const listMilestonesQuerySchema = z.object({
  status: z.enum(MILESTONE_STATUSES).optional(),
  assigneeId: z.string().cuid().optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type ListMilestonesQuery = z.infer<typeof listMilestonesQuerySchema>;
