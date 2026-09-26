import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { RolesService } from '../../../../core/services/roles.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { RoleListItem } from '../../../../core/models/role.models';
import {
  PermissionMatrixModule,
  PermissionMatrixResponse,
} from '../../../../core/models/permission.models';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-permission-matrix',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTooltipModule,
    HasPermissionDirective,
  ],
  templateUrl: './permission-matrix.component.html',
  styleUrls: ['./permission-matrix.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrixComponent implements OnInit {
  private readonly permissionsService = inject(PermissionsService);
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Señales de Estado ---
  public readonly availableRoles = signal<RoleListItem[]>([]);
  public readonly matrix = signal<PermissionMatrixResponse | null>(null);
  public readonly selectedIds = signal<Set<string>>(new Set<string>());
  public readonly isLoading = signal<boolean>(false);
  public readonly isSaving = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly propagationNotice = signal<boolean>(false);
  public readonly currentRoleId = signal<string | null>(null);

  private originalIds = new Set<string>();

  // --- Señales Computadas ---
  public readonly modules = computed<PermissionMatrixModule[]>(() =>
    [...(this.matrix()?.modules ?? [])].sort((a, b) => a.moduleOrder - b.moduleOrder)
  );

  public readonly totalPermissions = computed<number>(() =>
    this.modules().reduce((acc, m) => acc + m.actions.length, 0)
  );

  public readonly selectedCount = computed<number>(() => this.selectedIds().size);

  public readonly isDirty = computed<boolean>(() => {
    const current = this.selectedIds();
    if (current.size !== this.originalIds.size) return true;
    for (const id of current) {
      if (!this.originalIds.has(id)) return true;
    }
    return false;
  });

  public readonly isSystemRole = computed<boolean>(() =>
    this.availableRoles().find((r) => r.id === this.currentRoleId())?.isSystem ?? false
  );

  ngOnInit(): void {
    this.rolesService
      .listAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.availableRoles.set(roles);
          const fromUrl = this.route.snapshot.params['roleId'] as string | undefined;
          const target = roles.find((r) => r.id === fromUrl) ?? roles[0];
          if (target) {
            this.selectRole(target.id);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los roles del sistema.');
        },
      });
  }

  public selectRole(roleId: string): void {
    if (!roleId) return;
    this.currentRoleId.set(roleId);
    this.router.navigate(['/admin/permissions', roleId], { replaceUrl: true });
    this.loadMatrix(roleId);
  }

  private loadMatrix(roleId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.propagationNotice.set(false);

    this.permissionsService
      .getMatrix(roleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.matrix.set(res);
          const assigned = new Set<string>();
          for (const mod of res.modules) {
            for (const act of mod.actions) {
              if (act.isAssigned) {
                assigned.add(act.permissionId);
              }
            }
          }
          this.originalIds = new Set(assigned);
          this.selectedIds.set(new Set(assigned));
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.status === 404
              ? 'El rol seleccionado no existe.'
              : 'Ocurrió un error al cargar la matriz de permisos.'
          );
        },
      });
  }

  public togglePermission(permissionId: string): void {
    this.selectedIds.update((current) => {
      const updated = new Set(current);
      if (updated.has(permissionId)) {
        updated.delete(permissionId);
      } else {
        updated.add(permissionId);
      }
      return updated;
    });
  }

  public isPermissionSelected(permissionId: string): boolean {
    return this.selectedIds().has(permissionId);
  }

  public toggleModule(mod: PermissionMatrixModule): void {
    const allIds = mod.actions.map((a) => a.permissionId);
    const allSelected = allIds.every((id) => this.selectedIds().has(id));
    this.selectedIds.update((current) => {
      const updated = new Set(current);
      for (const id of allIds) {
        if (allSelected) {
          updated.delete(id);
        } else {
          updated.add(id);
        }
      }
      return updated;
    });
  }

  public isModuleSelected(mod: PermissionMatrixModule): boolean {
    return mod.actions.length > 0 && mod.actions.every((a) => this.selectedIds().has(a.permissionId));
  }

  public isModulePartial(mod: PermissionMatrixModule): boolean {
    const total = mod.actions.length;
    if (total === 0) return false;
    const n = mod.actions.filter((a) => this.selectedIds().has(a.permissionId)).length;
    return n > 0 && n < total;
  }

  public selectedInModule(mod: PermissionMatrixModule): number {
    return mod.actions.filter((a) => this.selectedIds().has(a.permissionId)).length;
  }

  public discard(): void {
    this.selectedIds.set(new Set(this.originalIds));
  }

  public save(): void {
    const roleId = this.currentRoleId();
    if (!roleId) return;

    const proceed = () => {
      this.isSaving.set(true);
      this.errorMessage.set(null);

      this.permissionsService
        .updateMatrix(roleId, Array.from(this.selectedIds()))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.originalIds = new Set(this.selectedIds());
            this.propagationNotice.set(true);
            this.snackBar.open('Permisos del rol actualizados exitosamente.', 'Cerrar', {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.isSaving.set(false);
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message ?? 'Ocurrió un error al guardar la matriz de permisos.';
            this.errorMessage.set(msg);
          },
        });
    };

    // Confirmación preventiva ante rol protegido del sistema o desasignación total
    if (this.isSystemRole() || this.selectedCount() === 0) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Confirmar cambios críticos',
          message: this.isSystemRole()
            ? `Estás modificando los permisos de un rol protegido del sistema ("${this.matrix()?.roleName}"). Los usuarios con este rol podrían perder acceso a módulos críticos. ¿Deseas continuar?`
            : 'Estás a punto de eliminar TODOS los permisos de este rol. Sus usuarios quedarán sin ningún permiso asignado. ¿Deseas continuar?',
          confirmText: 'Sí, guardar cambios',
          isDestructive: true,
          icon: 'warning',
        },
      });
      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          proceed();
        }
      });
    } else {
      proceed();
    }
  }

  public getModuleIcon(moduleCode: string): string {
    const c = (moduleCode || '').toUpperCase();
    if (c.includes('DASHBOARD')) return 'dashboard';
    if (c.includes('USER') || c.includes('CUSTOMER')) return 'people';
    if (c.includes('ROLE')) return 'admin_panel_settings';
    if (c.includes('PERMISSION') || c.includes('CONFIG')) return 'key';
    if (c.includes('PRODUCT') || c.includes('CATEGOR') || c.includes('BRAND')) return 'inventory_2';
    if (c.includes('INVENTOR') || c.includes('WAREHOUSE') || c.includes('LOT')) return 'warehouse';
    if (c.includes('SALE') || c.includes('ORDER')) return 'shopping_cart';
    if (c.includes('REPORT')) return 'bar_chart';
    return 'folder';
  }

  public onKeyDownPermission(event: KeyboardEvent, permissionId: string): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.togglePermission(permissionId);
    }
  }
}
