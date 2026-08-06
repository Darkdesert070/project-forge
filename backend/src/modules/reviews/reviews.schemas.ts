import { z } from 'zod';

export const REVIEW_DECISIONS = ['PENDING', 'APPROVED', 'APPROVED_WITH_COMMENTS', 'REJECTED'] as const;

export const createReviewSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160).default('Design Review'),
  reviewerId: z.string().cuid().optional().nullable(),
  reviewDate: z.coerce.date().optional(),
  decision: z.enum(REVIEW_DECISIONS).optional().default('PENDING'),
  comments: z.string().trim().max(4000).optional().default(''),
});

export const updateReviewSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    reviewerId: z.string().cuid().optional().nullable(),
    reviewDate: z.coerce.date().optional(),
    decision: z.enum(REVIEW_DECISIONS).optional(),
    comments: z.string().trim().max(4000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listReviewsQuerySchema = z.object({
  decision: z.enum(REVIEW_DECISIONS).optional(),
  reviewerId: z.string().cuid().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
