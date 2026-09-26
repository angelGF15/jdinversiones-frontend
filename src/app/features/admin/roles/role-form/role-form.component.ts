import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { RolesService } from '../../../../core/services/roles.service';
import {
  CreateRoleRequest,
  Role,
  UpdateRoleRequest,
} from '../../../../core/models/role.models';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTooltipModule,
    HasPermissionDirective,
  ],
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado ---
  public readonly isEditMode = signal<boolean>(false);
  public readonly roleId = signal<string | null>(null);
  public readonly role = signal<Role | null>(null);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  // --- Formulario Reactivo ---
  public readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.roleId.set(idParam);
      this.loadRoleDetail(idParam);
    }
  }

  private loadRoleDetail(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.rolesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.role.set(res);
          this.form.patchValue({
            name: res.name,
            description: res.description ?? '',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg =
            err.status === 404
              ? 'El rol solicitado no existe o fue eliminado.'
              : 'Ocurrió un error al cargar la información del rol.';
          this.errorMessage.set(msg);
        },
      });
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isEditMode()) {
      const id = this.roleId();
      if (!id) return;
      this.executePatch(id);
    } else {
      this.handleCreateSubmit();
    }
  }

  private handleCreateSubmit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: CreateRoleRequest = {
      name: raw.name!.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
    };

    this.rolesService
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackBar.open('Rol creado exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.router.navigate(['/admin/roles']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al registrar el rol.');
        },
      });
  }

  private executePatch(id: string): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: UpdateRoleRequest = {
      name: raw.name!.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
    };

    this.rolesService
      .update(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackBar.open('Rol actualizado exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.router.navigate(['/admin/roles']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al actualizar el rol.');
        },
      });
  }

  private handleHttpError(err: HttpErrorResponse, defaultMsg: string): void {
    const backendMsg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message;
    this.errorMessage.set(backendMsg ?? defaultMsg);
  }

  public getRoleIcon(): string {
    const roleName = this.form.controls.name.value || this.role()?.name || '';
    const lower = roleName.toLowerCase();
    if (lower.includes('admin')) return 'admin_panel_settings';
    if (lower.includes('vendedor') || lower.includes('seller') || lower.includes('venta')) return 'point_of_sale';
    if (lower.includes('cajer') || lower.includes('cashier') || lower.includes('caja')) return 'payments';
    if (lower.includes('almacen') || lower.includes('bodega') || lower.includes('inventario')) return 'inventory_2';
    if (lower.includes('supervisor') || lower.includes('auditor') || lower.includes('manager')) return 'verified_user';
    if (lower.includes('soporte') || lower.includes('support')) return 'support_agent';
    return 'security';
  }

  public get formattedCreatedAt(): string {
    const dateStr = this.role()?.createdAt;
    if (!dateStr) return 'No disponible';
    try {
      return new Date(dateStr).toLocaleDateString('es-HN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  public copyRoleId(): void {
    const id = this.roleId();
    if (!id) return;
    navigator.clipboard.writeText(id);
    this.snackBar.open('ID copiado al portapapeles.', 'Cerrar', {
      duration: 2500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  public onOpenMatrix(): void {
    const id = this.roleId();
    if (id) {
      this.router.navigate(['/admin/permissions', id]);
    }
  }

  public get permissionsCount(): number {
    return this.role()?.permissions?.length ?? 0;
  }
}
