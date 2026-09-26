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
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'ROLE_VIEW' },
        loadComponent: () =>
          import('./features/admin/roles/roles-list/roles-list.component').then(
            (m) => m.RolesListComponent
          ),
      },
      {
        path: 'roles/new',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'ROLE_CREATE' },
        loadComponent: () =>
          import('./features/admin/roles/role-form/role-form.component').then(
            (m) => m.RoleFormComponent
          ),
      },
      {
        path: 'roles/:id/edit',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'ROLE_EDIT' },
        loadComponent: () =>
          import('./features/admin/roles/role-form/role-form.component').then(
            (m) => m.RoleFormComponent
          ),
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'PERMISSION_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/permissions/permission-matrix/permission-matrix.component'
          ).then((m) => m.PermissionMatrixComponent),
      },
      {
        path: 'permissions/:roleId',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'PERMISSION_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/permissions/permission-matrix/permission-matrix.component'
          ).then((m) => m.PermissionMatrixComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
