import type { Request, Response } from 'express';
import * as service from './evidence.service';

export async function list(req: Request, res: Response): Promise<void> {
  const evidence = await service.listEvidence(req.user!, req.params.projectId, req.query as any);
  res.json({ evidence });
}

export async function create(req: Request, res: Response): Promise<void> {
  const evidence = await service.createEvidence(req.user!, req.params.projectId, req.body);
  res.status(201).json({ evidence });
}

export async function update(req: Request, res: Response): Promise<void> {
  const evidence = await service.updateEvidence(req.user!, req.params.id, req.body);
  res.json({ evidence });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteEvidence(req.user!, req.params.id);
  res.status(204).send();
}
