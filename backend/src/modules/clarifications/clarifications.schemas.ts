import { z } from 'zod';

export const CLARIFICATION_STATES = ['OPEN', 'ANSWERED', 'CLOSED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const createClarificationSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(4000),
  priority: z.enum(PRIORITIES).optional().default('MEDIUM'),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const updateClarificationSchema = z
  .object({
    question: z.string().trim().min(1).max(4000).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assigneeId: z.string().cuid().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const answerClarificationSchema = z.object({
  answer: z.string().trim().min(1, 'An answer is required').max(4000),
});

export const listClarificationsQuerySchema = z.object({
  status: z.enum(CLARIFICATION_STATES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

export type CreateClarificationInput = z.infer<typeof createClarificationSchema>;
export type UpdateClarificationInput = z.infer<typeof updateClarificationSchema>;
export type AnswerClarificationInput = z.infer<typeof answerClarificationSchema>;
export type ListClarificationsQuery = z.infer<typeof listClarificationsQuerySchema>;
