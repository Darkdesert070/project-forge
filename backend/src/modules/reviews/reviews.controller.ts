import type { Request, Response } from 'express';
import * as service from './reviews.service';

export async function list(req: Request, res: Response): Promise<void> {
  const reviews = await service.listReviews(req.user!, req.params.projectId, req.query as any);
  res.json({ reviews });
}

export async function create(req: Request, res: Response): Promise<void> {
  const review = await service.createReview(req.user!, req.params.projectId, req.body);
  res.status(201).json({ review });
}

export async function update(req: Request, res: Response): Promise<void> {
  const review = await service.updateReview(req.user!, req.params.id, req.body);
  res.json({ review });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteReview(req.user!, req.params.id);
  res.status(204).send();
}
