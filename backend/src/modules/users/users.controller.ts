import type { Request, Response } from 'express';
import * as usersService from './users.service';

export async function list(req: Request, res: Response): Promise<void> {
  const members = await usersService.listMembers(req.user!.workspaceId);
  res.json({ members });
}

export async function create(req: Request, res: Response): Promise<void> {
  const member = await usersService.createMember(req.user!, req.body);
  res.status(201).json({ member });
}

export async function update(req: Request, res: Response): Promise<void> {
  const member = await usersService.updateMember(req.user!, req.params.id, req.body);
  res.json({ member });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await usersService.resetPassword(req.user!, req.params.id, req.body.password);
  res.status(204).send();
}

export async function remove(req: Request, res: Response): Promise<void> {
  await usersService.removeMember(req.user!, req.params.id);
  res.status(204).send();
}

export async function removeInvitation(req: Request, res: Response): Promise<void> {
  await usersService.removeInvitation(req.user!, req.params.id);
  res.status(204).send();
}
