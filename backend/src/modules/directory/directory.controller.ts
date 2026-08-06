import type { Request, Response } from 'express';
import * as service from './directory.service';

export async function search(req: Request, res: Response): Promise<void> {
  const organisations = await service.searchDirectory(req.query as any);
  res.json({ organisations });
}

export async function profile(req: Request, res: Response): Promise<void> {
  const organisation = await service.getPublicProfile(req.params.slug);
  res.json({ organisation });
}

export async function visibility(req: Request, res: Response): Promise<void> {
  const organisation = await service.getOwnVisibility(req.user!);
  res.json({ organisation });
}

export async function updateVisibility(req: Request, res: Response): Promise<void> {
  const organisation = await service.updateVisibility(req.user!, req.body);
  res.json({ organisation });
}
