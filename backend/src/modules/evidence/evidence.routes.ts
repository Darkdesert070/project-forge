import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './evidence.controller';
import {
  createEvidenceSchema,
  listEvidenceQuerySchema,
  updateEvidenceSchema,
} from './evidence.schemas';

export const projectEvidenceRoutes = Router({ mergeParams: true });

projectEvidenceRoutes.use(requireAuth);
projectEvidenceRoutes.get(
  '/',
  validate(listEvidenceQuerySchema, 'query'),
  asyncHandler(controller.list),
);
projectEvidenceRoutes.post('/', validate(createEvidenceSchema), asyncHandler(controller.create));

export const evidenceRoutes = Router();

evidenceRoutes.use(requireAuth);
evidenceRoutes.patch('/:id', validate(updateEvidenceSchema), asyncHandler(controller.update));
evidenceRoutes.delete('/:id', requireAdmin, asyncHandler(controller.remove));
