import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireAuth } from '../../middleware/auth';
import { getDashboard } from './dashboard.service';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getDashboard(req.user!);
    res.json(data);
  }),
);

export default router;
