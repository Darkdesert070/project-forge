import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  // Root → dashboard (authGuard on the shell will bounce guests to /login).
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // Public auth pages (redirect signed-in users away).
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canMatch: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },

  // Public organisation directory. Deliberately outside the shell and outside
  // guestGuard: signed-in users can browse it too.
  {
    path: 'organisations',
    loadComponent: () =>
      import('./features/directory/directory-search.component').then(
        (m) => m.DirectorySearchComponent,
      ),
  },
  {
    path: 'organisations/:slug',
    loadComponent: () =>
      import('./features/directory/directory-profile.component').then(
        (m) => m.DirectoryProfileComponent,
      ),
  },

  // Authenticated app shell.
  {
    path: '',
    component: Shell,
    canMatch: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects-list.component').then(
            (m) => m.ProjectsListComponent,
          ),
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./features/team/team.component').then((m) => m.TeamComponent),
      },
      {
        path: 'projects/new',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/projects/project-form.component').then((m) => m.ProjectFormComponent),
      },
      {
        path: 'projects/:id/edit',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/projects/project-form.component').then((m) => m.ProjectFormComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./features/projects/project-detail.component').then(
            (m) => m.ProjectDetailComponent,
          ),
      },
    ],
  },

  // Unknown URL → send through the root redirect chain.
  { path: '**', redirectTo: '' },
];
