import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './milestones.controller';
import {
  createMilestoneSchema,
  listMilestonesQuerySchema,
  updateMilestoneSchema,
} from './milestones.schemas';

export const projectMilestoneRoutes = Router({ mergeParams: true });

projectMilestoneRoutes.use(requireAuth);
projectMilestoneRoutes.get(
  '/',
  validate(listMilestonesQuerySchema, 'query'),
  asyncHandler(controller.list),
);
projectMilestoneRoutes.post(
  '/',
  validate(createMilestoneSchema),
  asyncHandler(controller.create),
);

export const milestoneRoutes = Router();

milestoneRoutes.use(requireAuth);
milestoneRoutes.patch('/:id', validate(updateMilestoneSchema), asyncHandler(controller.update));
milestoneRoutes.delete('/:id', requireAdmin, asyncHandler(controller.remove));
