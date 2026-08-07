import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersService } from '../../core/api/users.service';
import { DirectoryService, type OwnVisibility } from '../../core/api/directory.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/toast';
import type { Member, Role } from '../../core/models';
import { formatDate } from '../../core/ui';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { BadgeComponent } from '../../shared/badge.component';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-team',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    AvatarComponent,
    BadgeComponent,
    IconComponent,
    ModalComponent,
  ],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss',
})
export class TeamComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly directoryService = inject(DirectoryService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly isAdmin = this.auth.isAdmin;
  readonly currentUserId = computed(() => this.auth.user()?.id ?? '');
  readonly formatDate = formatDate;

  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Placeholder rows rendered while the roster loads. */
  readonly skeletonRows = [0, 1, 2, 3, 4];

  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly busyId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['MEMBER' as Role, [Validators.required]],
  });

  readonly adminCount = computed(() => this.members().filter((m) => m.role === 'ADMIN').length);

  readonly visibility = signal<OwnVisibility | null>(null);
  readonly savingVisibility = signal(false);
  tagline = '';

  constructor() {
    this.load();
    if (this.isAdmin()) {
      this.loadVisibility();
    }
  }

  private loadVisibility(): void {
    this.directoryService.visibility().subscribe({
      next: (v) => {
        this.visibility.set(v);
        this.tagline = v.tagline;
      },
      // A failure here must not block the roster, which is the page's real job.
      error: () => this.visibility.set(null),
    });
  }

  /**
   * Publishing is a deliberate act, so turning it on asks for confirmation and
   * states plainly what becomes visible. Turning it off does not.
   */
  toggleVisibility(): void {
    const current = this.visibility();
    if (!current) return;

    if (!current.isPublic) {
      const ok = window.confirm(
        `Publish "${current.name}" to the public directory?\n\n` +
          'Anyone will be able to find it by name and see the description, ' +
          'project count and member count.\n\n' +
          'Project names, client names and member details stay private.',
      );
      if (!ok) return;
    }

    this.savingVisibility.set(true);
    this.directoryService.updateVisibility({ isPublic: !current.isPublic }).subscribe({
      next: (v) => {
        this.visibility.set(v);
        this.savingVisibility.set(false);
        this.toast.success(
          v.isPublic
            ? 'Public profile published.'
            : 'Public profile removed.',
        );
      },
      error: (err: HttpErrorResponse) => {
        this.toast.fromHttp(err, 'Could not update visibility.');
        this.savingVisibility.set(false);
      },
    });
  }

  saveTagline(): void {
    this.savingVisibility.set(true);
    this.directoryService.updateVisibility({ tagline: this.tagline }).subscribe({
      next: (v) => {
        this.visibility.set(v);
        this.savingVisibility.set(false);
        this.toast.success('Description updated.');
      },
      error: (err: HttpErrorResponse) => {
        this.toast.fromHttp(err, 'Could not save the description.');
        this.savingVisibility.set(false);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.usersService.listMembers().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the team.');
        this.loading.set(false);
      },
    });
  }

  openModal(): void {
    this.form.reset({ name: '', email: '', role: 'MEMBER' });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
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
    this.formError.set('');
    const { name, email, role } = this.form.getRawValue();
    this.usersService.create({ name, email, role }).subscribe({
      next: (member) => {
        this.members.update((list) => [member, ...list]);
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(`${member.name} was added`, `They can sign in with ${member.email}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.error ?? 'Could not add the member.');
        this.saving.set(false);
      },
    });
  }

  changeRole(member: Member, role: Role): void {
    if (member.role === role) return;
    this.busyId.set(member.id);
    this.usersService.updateRole(member.id, role).subscribe({
      next: (updated) => {
        this.members.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        this.busyId.set(null);
        this.toast.success(`${updated.name} is now ${role === 'ADMIN' ? 'an admin' : 'a member'}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.toast.fromHttp(err, 'Could not change role.');
        this.busyId.set(null);
        this.load();
      },
    });
  }

  resetPassword(member: Member): void {
    const pw = window.prompt(`Set a new password for ${member.name} (min 8 characters):`);
    if (!pw) return;
    if (pw.length < 8) {
      this.toast.warning('Password must be at least 8 characters.');
      return;
    }
    this.busyId.set(member.id);
    this.usersService.resetPassword(member.id, pw).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Password updated for ${member.name}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.toast.fromHttp(err, 'Could not reset password.');
      },
    });
  }

  remove(member: Member): void {
    const pending = member.status === 'PENDING';
    const question = pending
      ? `Withdraw the invitation for ${member.email}?`
      : `Remove ${member.name} from the workspace? Their account is kept, and records they authored are preserved.`;
    if (!window.confirm(question)) return;

    this.busyId.set(member.id);
    const request = pending
      ? this.usersService.removeInvitation(member.id)
      : this.usersService.remove(member.id);
    request.subscribe({
      next: () => {
        this.members.update((list) => list.filter((m) => m.id !== member.id));
        this.busyId.set(null);
        this.toast.success(
          pending ? `Invitation for ${member.email} withdrawn.` : `${member.name} was removed.`,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.toast.fromHttp(err, 'Could not remove the member.');
        this.busyId.set(null);
      },
    });
  }
}
