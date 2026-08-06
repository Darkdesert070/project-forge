import type { Request, Response } from 'express';
import * as projectService from './projects.service';

export async function list(req: Request, res: Response): Promise<void> {
  const projects = await projectService.listProjects(req.user!, req.query as any);
  res.json({ projects });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const project = await projectService.getProject(req.user!, req.params.id);
  res.json({ project });
}

export async function create(req: Request, res: Response): Promise<void> {
  const project = await projectService.createProject(req.user!, req.body);
  res.status(201).json({ project });
}

export async function update(req: Request, res: Response): Promise<void> {
  const project = await projectService.updateProject(req.user!, req.params.id, req.body);
  res.json({ project });
}

export async function archive(req: Request, res: Response): Promise<void> {
  const project = await projectService.setArchived(req.user!, req.params.id, true);
  res.json({ project });
}

export async function restore(req: Request, res: Response): Promise<void> {
  const project = await projectService.setArchived(req.user!, req.params.id, false);
  res.json({ project });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await projectService.deleteProject(req.user!, req.params.id);
  res.status(204).send();
}
