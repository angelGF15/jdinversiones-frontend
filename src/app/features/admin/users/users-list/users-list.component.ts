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

import { AuthState } from '../../../../core/auth/auth.state';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { UsersService } from '../../../../core/services/users.service';
import { User, UserListQuery } from '../../../../core/models/user.models';
import {
  DataTableColumn,
  FilterSelect,
  FilterToggle,
} from '../../../../shared/models/data-table.models';
import {
  DataTableComponent,
  DataTableColumnDirective,
  ListFiltersComponent,
  PaginationComponent,
} from '../../../../shared/components';
import { ListQueryState } from '../../../../shared/utils/list-query-state';
import { ConfirmDialogComponent, CredentialsDialogComponent } from '../dialogs';

@Component({
  selector: 'app-users-list',
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
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  public readonly authState = inject(AuthState);

  /** Gestor reactivo de estado de listado sincronizado con la URL (deep-linking). */
  public readonly queryState = new ListQueryState<UserListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<User[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  private readonly brokenAvatarIds = signal<Set<string>>(new Set<string>());

  // --- Opciones de Filtros ---
  public readonly roleFilters = signal<FilterSelect[]>([]);
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activos' },
  ];

  /** Definición de columnas para app-data-table. */
  public readonly columns: DataTableColumn<User>[] = [
    { key: 'fullName', header: 'Usuario', width: '280px' },
    { key: 'email', header: 'Correo electrónico', width: '240px' },
    { key: 'roles', header: 'Roles asignados', width: '200px' },
    { key: 'phone', header: 'Teléfono', width: '150px' },
    { key: 'isActive', header: 'Estado', width: '120px', align: 'center' },
    { key: 'lastLoginAt', header: 'Último acceso', type: 'date', width: '180px' },
    { header: 'Acciones', width: '160px', align: 'right', stickyEnd: true },
  ];

  ngOnInit(): void {
    // 1. Cargar catálogo de roles activos para poblar el filtro dropdown
    this.loadRolesCatalog();

    // 2. Conectar reactivamente los cambios de queryState hacia el servicio con switchMap anti-carreras
    toObservable(this.queryState.state, { injector: this.injector })
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((query) =>
          this.usersService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el listado de usuarios.';
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

  private loadRolesCatalog(): void {
    this.usersService
      .listActiveRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roleFilters.set([
            {
              key: 'roleId',
              label: 'Rol',
              options: roles.map((r) => ({ value: r.roleId, label: r.name })),
              allowClear: true,
            },
          ]);
        },
        error: () => {
          // Si falla la carga de catálogo de roles, se mantiene el listado funcional
        },
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

  /**
   * Genera las iniciales del nombre completo para el avatar visual del usuario.
   */
  public getUserInitials(user: User): string {
    if (!user?.fullName) return 'U';
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  public isAvatarBroken(userId: string): boolean {
    return this.brokenAvatarIds().has(userId);
  }

  public onAvatarImgError(userId: string): void {
    this.brokenAvatarIds.update((set) => {
      const updated = new Set(set);
      updated.add(userId);
      return updated;
    });
  }

  public onEditUser(user: User): void {
    this.router.navigate(['/admin/users', user.userId, 'edit']);
  }

  /**
   * Determina si el usuario evaluado corresponde a la sesión actualmente autenticada
   * para prevenir auto-desactivación accidental.
   */
  public isSelfUser(user: User): boolean {
    const currentUserId = this.authState.profile()?.userId;
    return !!currentUserId && currentUserId === user.userId;
  }

  /**
   * Cambia el estado activo/inactivo del usuario previa confirmación modal.
   * Actualiza el signal local `items` sin recargar toda la página si la petición es exitosa.
   */
  public onToggleStatus(user: User): void {
    if (this.isSelfUser(user)) {
      this.snackBar.open('No puedes desactivar tu propia cuenta de usuario.', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
      });
      return;
    }

    const willBeActive = !user.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? 'Activar usuario' : 'Desactivar usuario',
        message: willBeActive
          ? `¿Deseas activar la cuenta de "${user.fullName}"? El usuario podrá volver a iniciar sesión en la plataforma.`
          : `¿Deseas desactivar la cuenta de "${user.fullName}"? El usuario perderá el acceso y no podrá iniciar sesión.`,
        confirmText: willBeActive ? 'Activar' : 'Desactivar',
        isDestructive: !willBeActive,
        icon: willBeActive ? 'check_circle' : 'block',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.usersService.setStatus(user.userId, willBeActive).subscribe({
        next: (updatedUser) => {
          this.items.update((users) =>
            users.map((u) => (u.userId === user.userId ? { ...u, isActive: updatedUser.isActive } : u))
          );
          this.snackBar.open(
            updatedUser.isActive
              ? `Usuario "${user.fullName}" activado exitosamente`
              : `Usuario "${user.fullName}" desactivado exitosamente`,
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
            : err?.error?.message ?? 'Ocurrió un error al cambiar el estado del usuario.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
    });
  }

  /**
   * Regenera la contraseña temporal del usuario y la despliega en modal con opción de copia.
   */
  public onGenerateTemporaryPassword(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Regenerar Contraseña Temporal',
        message: `¿Estás seguro de que deseas generar una nueva contraseña temporal para "${user.fullName}" (${user.email})? La contraseña temporal previa quedará invalidada inmediatamente.`,
        confirmText: 'Regenerar Contraseña',
        isDestructive: false,
        icon: 'lock_reset',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.usersService.generateTemporaryPassword(user.userId).subscribe({
        next: (res) => {
          this.dialog.open(CredentialsDialogComponent, {
            width: '500px',
            disableClose: true,
            data: {
              email: res.email,
              temporaryPassword: res.temporaryPassword,
              emailSent: false,
            },
          });
          this.snackBar.open('Nueva contraseña temporal generada correctamente.', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al generar la contraseña temporal.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
    });
  }
}

