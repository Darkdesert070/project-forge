import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectsService } from '../../core/api/projects.service';
import { UsersService } from '../../core/api/users.service';
import type { ProjectInput, PublicUser } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink, AvatarComponent, IconComponent],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.scss',
})
export class ProjectFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly usersService = inject(UsersService);

  readonly projectId = signal<string | null>(null);
  readonly isEdit = computed(() => this.projectId() !== null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly users = signal<PublicUser[]>([]);
  readonly selectedMembers = signal<Set<string>>(new Set());
  readonly tags = signal<string[]>([]);
  readonly tagDraft = signal('');

  readonly statusOptions = [
    { value: 'PLANNING', label: 'Planning' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'COMPLETED', label: 'Completed' },
  ];
  readonly priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    client: [''],
    description: [''],
    status: ['PLANNING'],
    priority: ['MEDIUM'],
    startDate: [''],
    endDate: [''],
    progress: [0],
    managerId: [''],
  });

  constructor() {
    this.usersService.list().subscribe((users) => this.users.set(users));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId.set(id);
      this.loadProject(id);
    }
  }

  private toDateInput(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private loadProject(id: string): void {
    this.loading.set(true);
    this.projectsService.get(id).subscribe({
      next: (p) => {
        this.form.patchValue({
          name: p.name,
          client: p.client,
          description: p.description,
          status: p.status,
          priority: p.priority,
          startDate: this.toDateInput(p.startDate),
          endDate: this.toDateInput(p.endDate),
          progress: p.progress,
          managerId: p.manager?.id ?? '',
        });
        this.tags.set([...p.tags]);
        this.selectedMembers.set(new Set(p.members.map((m) => m.id)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the project.');
        this.loading.set(false);
      },
    });
  }

  toggleMember(id: string): void {
    this.selectedMembers.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isMember(id: string): boolean {
    return this.selectedMembers().has(id);
  }

  addTag(): void {
    const value = this.tagDraft().trim();
    if (value && !this.tags().includes(value) && this.tags().length < 20) {
      this.tags.update((t) => [...t, value]);
    }
    this.tagDraft.set('');
  }

  onTagKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const payload: ProjectInput = {
      name: raw.name,
      client: raw.client,
      description: raw.description,
      status: raw.status as ProjectInput['status'],
      priority: raw.priority as ProjectInput['priority'],
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      progress: Number(raw.progress) || 0,
      managerId: raw.managerId || null,
      memberIds: [...this.selectedMembers()],
      tags: this.tags(),
    };

    const id = this.projectId();
    const request = id
      ? this.projectsService.update(id, payload)
      : this.projectsService.create(payload);

    request.subscribe({
      next: (project) => this.router.navigate(['/projects', project.id]),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Could not save the project.');
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    const id = this.projectId();
    this.router.navigate(id ? ['/projects', id] : ['/projects']);
  }
}
