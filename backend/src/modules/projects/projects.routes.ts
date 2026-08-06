import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import * as controller from './projects.controller';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './projects.schemas';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listProjectsQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));

// Mutations are admin-only per the spec (Admin manages projects).
router.post('/', requireAdmin, validate(createProjectSchema), asyncHandler(controller.create));
router.patch('/:id', requireAdmin, validate(updateProjectSchema), asyncHandler(controller.update));
router.post('/:id/archive', requireAdmin, asyncHandler(controller.archive));
router.post('/:id/restore', requireAdmin, asyncHandler(controller.restore));
router.delete('/:id', requireAdmin, asyncHandler(controller.remove));

export default router;
