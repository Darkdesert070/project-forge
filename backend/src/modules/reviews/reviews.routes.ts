import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './reviews.controller';
import { createReviewSchema, listReviewsQuerySchema, updateReviewSchema } from './reviews.schemas';

export const projectReviewRoutes = Router({ mergeParams: true });

projectReviewRoutes.use(requireAuth);
projectReviewRoutes.get(
  '/',
  validate(listReviewsQuerySchema, 'query'),
  asyncHandler(controller.list),
);
projectReviewRoutes.post('/', validate(createReviewSchema), asyncHandler(controller.create));

export const reviewRoutes = Router();

reviewRoutes.use(requireAuth);
reviewRoutes.patch('/:id', validate(updateReviewSchema), asyncHandler(controller.update));
reviewRoutes.delete('/:id', requireAdmin, asyncHandler(controller.remove));
