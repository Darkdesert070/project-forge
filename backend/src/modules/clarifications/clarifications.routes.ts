import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './clarifications.controller';
import {
  answerClarificationSchema,
  createClarificationSchema,
  listClarificationsQuerySchema,
  updateClarificationSchema,
} from './clarifications.schemas';

export const projectClarificationRoutes = Router({ mergeParams: true });

projectClarificationRoutes.use(requireAuth);
projectClarificationRoutes.get(
  '/',
  validate(listClarificationsQuerySchema, 'query'),
  asyncHandler(controller.list),
);
projectClarificationRoutes.post(
  '/',
  validate(createClarificationSchema),
  asyncHandler(controller.create),
);

export const clarificationRoutes = Router();

clarificationRoutes.use(requireAuth);
clarificationRoutes.patch(
  '/:id',
  validate(updateClarificationSchema),
  asyncHandler(controller.update),
);
clarificationRoutes.post(
  '/:id/answer',
  validate(answerClarificationSchema),
  asyncHandler(controller.answer),
);
clarificationRoutes.post('/:id/close', asyncHandler(controller.close));
clarificationRoutes.delete('/:id', requireAdmin, asyncHandler(controller.remove));
