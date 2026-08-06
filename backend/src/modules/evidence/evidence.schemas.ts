import { z } from 'zod';

export const EVIDENCE_TYPES = [
  'PDF',
  'CAD',
  'SIMULATION',
  'TESTING',
  'LINK',
  'IMAGE',
  'VIDEO',
  'DOCUMENT',
] as const;

export const createEvidenceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  type: z.enum(EVIDENCE_TYPES).optional().default('LINK'),
  url: z.string().trim().url('A valid URL is required').max(2000),
  description: z.string().trim().max(2000).optional().default(''),
});

export const updateEvidenceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    type: z.enum(EVIDENCE_TYPES).optional(),
    url: z.string().trim().url('A valid URL is required').max(2000).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listEvidenceQuerySchema = z.object({
  type: z.enum(EVIDENCE_TYPES).optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type ListEvidenceQuery = z.infer<typeof listEvidenceQuerySchema>;
