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
      {
        path: 'config',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'CONFIG_VIEW' },
        loadComponent: () =>
          import('./features/admin/config/config-page/config-page.component').then(
            (m) => m.ConfigPageComponent
          ),
      },
      {
        path: 'inventory/attributes',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'ATTRIBUTE_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/inventory/attributes/attributes-list/attributes-list.component'
          ).then((m) => m.AttributesListComponent),
      },
      {
        path: 'inventory/brands',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'BRAND_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/inventory/brands/brands-list/brands-list.component'
          ).then((m) => m.BrandsListComponent),
      },
      {
        path: 'inventory/categories',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'CATEGORY_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/inventory/categories/categories-list/categories-list.component'
          ).then((m) => m.CategoriesListComponent),
      },
      {
        path: 'inventory/categories/new',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'CATEGORY_CREATE' },
        loadComponent: () =>
          import(
            './features/admin/inventory/categories/category-form/category-form.component'
          ).then((m) => m.CategoryFormComponent),
      },
      {
        path: 'inventory/categories/:id/edit',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'CATEGORY_EDIT' },
        loadComponent: () =>
          import(
            './features/admin/inventory/categories/category-form/category-form.component'
          ).then((m) => m.CategoryFormComponent),
      },
      {
        path: 'inventory/products',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'PRODUCT_VIEW' },
        loadComponent: () =>
          import(
            './features/admin/inventory/products/products-list/products-list.component'
          ).then((m) => m.ProductsListComponent),
      },
      {
        path: 'inventory/products/new',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'PRODUCT_CREATE' },
        loadComponent: () =>
          import(
            './features/admin/inventory/products/product-form/product-form.component'
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: 'inventory/products/:id/edit',
        canActivate: [permissionGuard],
        data: { requiredPermission: 'PRODUCT_EDIT' },
        loadComponent: () =>
          import(
            './features/admin/inventory/products/product-form/product-form.component'
          ).then((m) => m.ProductFormComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
