import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../shared/icon.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, IconComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly menuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'grid' },
    { label: 'Projects', path: '/projects', icon: 'folder' },
    { label: 'Team', path: '/team', icon: 'users' },
    { label: 'Organisations', path: '/organisations', icon: 'search' },
  ];

  readonly comingSoon: NavItem[] = [
    { label: 'Reports', path: '', icon: 'chart' },
    { label: 'Settings', path: '', icon: 'cog' },
  ];

  readonly greeting = computed(() => {
    const name = this.user()?.name?.split(' ')[0] ?? '';
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${name}`;
  });

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.menuOpen.set(false);
    await this.router.navigate(['/login']);
  }
}
