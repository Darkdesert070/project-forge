import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { countUnread, listUserNotifications, serializeNotification } from './notifications.service';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [notifications, unread] = await Promise.all([
      listUserNotifications(req.user!.id, 30),
      countUnread(req.user!.id),
    ]);
    res.json({ notifications, unread });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Notification not found');
    }
    if (existing.userId !== req.user!.id) {
      throw new HttpError(403, 'You can only update your own notifications');
    }
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ notification: serializeNotification(notification) });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ unread: 0 });
  }),
);

export default router;
