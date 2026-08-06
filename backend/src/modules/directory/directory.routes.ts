import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './directory.controller';
import { searchDirectorySchema, updateVisibilitySchema } from './directory.schemas';

/**
 * Public routes. These are the only endpoints in the system reachable without
 * authentication, and they expose nothing beyond an organisation's name,
 * tagline and record counts.
 */
export const publicDirectoryRoutes = Router();

publicDirectoryRoutes.get(
  '/search',
  validate(searchDirectorySchema, 'query'),
  asyncHandler(controller.search),
);
publicDirectoryRoutes.get('/:slug', asyncHandler(controller.profile));

/** Administrator control over whether their own workspace is published. */
export const directoryAdminRoutes = Router();

directoryAdminRoutes.use(requireAuth);
directoryAdminRoutes.get('/', asyncHandler(controller.visibility));
directoryAdminRoutes.patch(
  '/',
  requireAdmin,
  validate(updateVisibilitySchema),
  asyncHandler(controller.updateVisibility),
);
