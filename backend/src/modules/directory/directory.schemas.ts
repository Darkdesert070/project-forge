import { z } from 'zod';

/**
 * A minimum length is required deliberately. Without it, an empty or
 * single-character term would return the entire directory, which would turn a
 * lookup feature into a way of enumerating every organisation on the platform.
 */
export const searchDirectorySchema = z.object({
  q: z.string().trim().min(3, 'Enter at least three characters').max(80),
});

export const updateVisibilitySchema = z
  .object({
    isPublic: z.boolean().optional(),
    tagline: z.string().trim().max(160).optional(),
  })
  .refine((v) => v.isPublic !== undefined || v.tagline !== undefined, {
    message: 'Nothing to update',
  });

export type SearchDirectoryQuery = z.infer<typeof searchDirectorySchema>;
export type UpdateVisibilityInput = z.infer<typeof updateVisibilitySchema>;
