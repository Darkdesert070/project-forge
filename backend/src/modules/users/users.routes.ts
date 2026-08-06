import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './users.controller';
import { createMemberSchema, resetPasswordSchema, updateMemberSchema } from './users.schemas';

const router = Router();

router.use(requireAuth);

// Any authenticated user can view the workspace roster (used for assignment dropdowns).
router.get('/', asyncHandler(controller.list));

// Managing members is admin-only.
router.post('/', requireAdmin, validate(createMemberSchema), asyncHandler(controller.create));
router.patch('/:id', requireAdmin, validate(updateMemberSchema), asyncHandler(controller.update));
router.post(
  '/:id/reset-password',
  requireAdmin,
  validate(resetPasswordSchema),
  asyncHandler(controller.resetPassword),
);
router.delete('/:id', requireAdmin, asyncHandler(controller.remove));
router.delete('/invitations/:id', requireAdmin, asyncHandler(controller.removeInvitation));

export default router;
