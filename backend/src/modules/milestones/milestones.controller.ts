import type { Request, Response } from 'express';
import * as service from './milestones.service';

export async function list(req: Request, res: Response): Promise<void> {
  const milestones = await service.listMilestones(
    req.user!,
    req.params.projectId,
    req.query as any,
  );
  res.json({ milestones });
}

export async function create(req: Request, res: Response): Promise<void> {
  const milestone = await service.createMilestone(req.user!, req.params.projectId, req.body);
  res.status(201).json({ milestone });
}

export async function update(req: Request, res: Response): Promise<void> {
  const milestone = await service.updateMilestone(req.user!, req.params.id, req.body);
  res.json({ milestone });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteMilestone(req.user!, req.params.id);
  res.status(204).send();
}
