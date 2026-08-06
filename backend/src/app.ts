import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import { prisma } from './lib/prisma';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/projects.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import userRoutes from './modules/users/users.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import { milestoneRoutes, projectMilestoneRoutes } from './modules/milestones/milestones.routes';
import { projectReviewRoutes, reviewRoutes } from './modules/reviews/reviews.routes';
import {
  clarificationRoutes,
  projectClarificationRoutes,
} from './modules/clarifications/clarifications.routes';
import { evidenceRoutes, projectEvidenceRoutes } from './modules/evidence/evidence.routes';
import {
  directoryAdminRoutes,
  publicDirectoryRoutes,
} from './modules/directory/directory.routes';

export function createApp() {
  const app = express();

  // Behind nginx or a platform load balancer, so req.protocol and req.ip
  // must come from the X-Forwarded-* headers for secure cookies to be set.
  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  // Same-origin deployments never send an Origin header on these requests, so
  // CORS only matters for local development and split-domain hosting.
  app.use(cors({ origin: env.clientUrl.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        service: 'project-forge-api',
        database: 'up',
        time: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'degraded',
        service: 'project-forge-api',
        database: 'down',
        time: new Date().toISOString(),
      });
    }
  });

  // The only unauthenticated surface besides /health. Exposes an organisation's
  // name, tagline and record counts, and only for workspaces that have opted in.
  api.use('/organisations', publicDirectoryRoutes);

  api.use('/auth', authRoutes);
  api.use('/workspace/visibility', directoryAdminRoutes);
  api.use('/projects', projectRoutes);
  api.use('/projects/:projectId/milestones', projectMilestoneRoutes);
  api.use('/projects/:projectId/reviews', projectReviewRoutes);
  api.use('/projects/:projectId/clarifications', projectClarificationRoutes);
  api.use('/projects/:projectId/evidence', projectEvidenceRoutes);
  api.use('/milestones', milestoneRoutes);
  api.use('/reviews', reviewRoutes);
  api.use('/clarifications', clarificationRoutes);
  api.use('/evidence', evidenceRoutes);
  api.use('/dashboard', dashboardRoutes);
  api.use('/users', userRoutes);
  api.use('/notifications', notificationRoutes);

  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
