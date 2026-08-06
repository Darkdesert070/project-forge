import { z } from 'zod';

export const ROLES = ['ADMIN', 'MEMBER'] as const;

/**
 * Adding a member no longer sets a password. The invited person either already
 * has an account, in which case they are joined immediately, or they register
 * later with the same address and are joined automatically at that point.
 */
export const createMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: z.enum(ROLES).optional().default('MEMBER'),
});

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(ROLES).optional(),
  })
  .refine((v) => v.name !== undefined || v.role !== undefined, {
    message: 'Nothing to update',
  });

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
