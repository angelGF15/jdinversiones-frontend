import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  Injector,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { RolesService } from '../../../../core/services/roles.service';
import {
  CloneRoleRequest,
  RoleListItem,
  RoleListQuery,
} from '../../../../core/models/role.models';
import {
  DataTableColumn,
  FilterToggle,
} from '../../../../shared/models/data-table.models';
import {
  DataTableComponent,
  DataTableColumnDirective,
  ListFiltersComponent,
  PaginationComponent,
} from '../../../../shared/components';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ListQueryState } from '../../../../shared/utils/list-query-state';
import { CloneRoleDialogComponent } from '../dialogs/clone-role-dialog/clone-role-dialog.component';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTooltipModule,
    HasPermissionDirective,
    DataTableComponent,
    DataTableColumnDirective,
    ListFiltersComponent,
    PaginationComponent,
  ],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Gestor reactivo de estado de listado sincronizado con la URL (deep-linking). */
  public readonly queryState = new ListQueryState<RoleListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<RoleListItem[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  // --- Opciones de Filtros ---
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activos' },
  ];

  /** Definición de columnas para app-data-table. */
  public readonly columns: DataTableColumn<RoleListItem>[] = [
    { key: 'name', header: 'Rol', width: '220px' },
    { key: 'description', header: 'Descripción', width: '260px' },
    { key: 'permissionsCount', header: 'Permisos', width: '120px', align: 'center' },
    { key: 'isActive', header: 'Estado', width: '120px', align: 'center' },
    { key: 'createdAt', header: 'Creado', type: 'date', width: '180px' },
    { header: 'Acciones', width: '220px', align: 'right', stickyEnd: true },
  ];

  ngOnInit(): void {
    // Conectar reactivamente los cambios de queryState hacia el servicio con switchMap anti-carreras
    toObservable(this.queryState.state, { injector: this.injector })
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((query) =>
          this.rolesService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el listado de roles.';
              this.errorMessage.set(msg);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res) {
          this.items.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
        }
      });
  }

  public onFilterChange(filters: Record<string, unknown>): void {
    this.queryState.updateFilters(filters);
  }

  public onPageChange(page: number): void {
    this.queryState.setPage(page);
  }

  public onPageSizeChange(size: number): void {
    this.queryState.setSize(size);
  }

  public retry(): void {
    this.queryState.applyToUrl();
  }

  public onEditRole(role: RoleListItem): void {
    this.router.navigate(['/admin/roles', role.id, 'edit']);
  }

  public onOpenMatrix(role: RoleListItem): void {
    this.router.navigate(['/admin/permissions', role.id]);
  }

  public onCloneRole(role: RoleListItem): void {
    const dialogRef = this.dialog.open(CloneRoleDialogComponent, {
      width: '460px',
      maxWidth: '90vw',
      data: {
        sourceRoleName: role.name,
        sourcePermissionsCount: role.permissionsCount,
      },
    });

    dialogRef.afterClosed().subscribe((payload: CloneRoleRequest | null) => {
      if (!payload) return;

      this.rolesService.clone(role.id, payload).subscribe({
        next: (created) => {
          this.snackBar.open(`Rol "${created.name}" clonado exitosamente`, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.queryState.applyToUrl();
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al clonar el rol.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
    });
  }

  public onToggleStatus(role: RoleListItem): void {
    if (role.isSystem && role.isActive) {
      this.snackBar.open('Los roles de sistema no se pueden desactivar.', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    const willBeActive = !role.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? 'Activar rol' : 'Desactivar rol',
        message: willBeActive
          ? `¿Deseas activar el rol "${role.name}"? Los usuarios con este rol recuperarán los accesos asignados.`
          : `¿Deseas desactivar el rol "${role.name}"? Los usuarios con este rol perderán el acceso hasta que se reactive.`,
        confirmText: willBeActive ? 'Activar' : 'Desactivar',
        isDestructive: !willBeActive,
        icon: willBeActive ? 'check_circle' : 'block',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.rolesService.setStatus(role.id, willBeActive).subscribe({
        next: (updated) => {
          this.items.update((roles) =>
            roles.map((r) => (r.id === role.id ? { ...r, isActive: updated.isActive } : r))
          );
          this.snackBar.open(
            updated.isActive
              ? `Rol "${role.name}" activado exitosamente`
              : `Rol "${role.name}" desactivado exitosamente`,
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al cambiar el estado del rol.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
    });
  }

  public onDeleteRole(role: RoleListItem): void {
    if (role.isSystem) {
      this.snackBar.open('Los roles de sistema no se pueden eliminar.', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Eliminar rol',
        message: `¿Deseas eliminar permanentemente el rol "${role.name}"? Esta acción no se puede deshacer y solo es posible si el rol no tiene usuarios activos asignados.`,
        confirmText: 'Eliminar',
        isDestructive: true,
        icon: 'delete',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.rolesService.remove(role.id).subscribe({
        next: () => {
          this.items.set(this.items().filter((r) => r.id !== role.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.snackBar.open(`Rol "${role.name}" eliminado exitosamente`, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al eliminar el rol.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
    });
  }

  public getRoleIcon(roleName: string): string {
    const lower = (roleName || '').toLowerCase();
    if (lower.includes('admin')) return 'admin_panel_settings';
    if (lower.includes('vendedor') || lower.includes('seller') || lower.includes('venta')) return 'point_of_sale';
    if (lower.includes('cajer') || lower.includes('cashier') || lower.includes('caja')) return 'payments';
    if (lower.includes('almacen') || lower.includes('bodega') || lower.includes('inventario')) return 'inventory_2';
    if (lower.includes('supervisor') || lower.includes('auditor') || lower.includes('manager')) return 'verified_user';
    if (lower.includes('soporte') || lower.includes('support')) return 'support_agent';
    return 'security';
  }
}
