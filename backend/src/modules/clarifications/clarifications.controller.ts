import type { Request, Response } from 'express';
import * as service from './clarifications.service';

export async function list(req: Request, res: Response): Promise<void> {
  const clarifications = await service.listClarifications(
    req.user!,
    req.params.projectId,
    req.query as any,
  );
  res.json({ clarifications });
}

export async function create(req: Request, res: Response): Promise<void> {
  const clarification = await service.createClarification(
    req.user!,
    req.params.projectId,
    req.body,
  );
  res.status(201).json({ clarification });
}

export async function update(req: Request, res: Response): Promise<void> {
  const clarification = await service.updateClarification(req.user!, req.params.id, req.body);
  res.json({ clarification });
}

export async function answer(req: Request, res: Response): Promise<void> {
  const clarification = await service.answerClarification(req.user!, req.params.id, req.body);
  res.json({ clarification });
}

export async function close(req: Request, res: Response): Promise<void> {
  const clarification = await service.closeClarification(req.user!, req.params.id);
  res.json({ clarification });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteClarification(req.user!, req.params.id);
  res.status(204).send();
}
