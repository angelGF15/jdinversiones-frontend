import { Routes } from '@angular/router';
import { authGuard, loggedInGuard, permissionGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'USER_VIEW' },
        loadComponent: () =>
          import('./features/admin/users/users-list/users-list.component').then(
            (m) => m.UsersListComponent
          ),
      },
      {
        path: 'users/new',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'USER_CREATE' },
        loadComponent: () =>
          import('./features/admin/users/user-form/user-form.component').then(
            (m) => m.UserFormComponent
          ),
      },
      {
        path: 'users/:id/edit',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'USER_EDIT' },
        loadComponent: () =>
          import('./features/admin/users/user-form/user-form.component').then(
            (m) => m.UserFormComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
