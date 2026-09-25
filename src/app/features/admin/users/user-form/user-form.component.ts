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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UsersService } from '../../../../core/services/users.service';
import {
  ActiveRole,
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from '../../../../core/models/user.models';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { AvatarUploadDialogComponent } from '../../../../shared/components/avatar-upload-dialog/avatar-upload-dialog.component';
import { CredentialsDialogComponent } from '../dialogs/credentials-dialog/credentials-dialog.component';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    HasPermissionDirective,
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado ---
  public readonly isEditMode = signal<boolean>(false);
  public readonly userId = signal<string | null>(null);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly availableRoles = signal<ActiveRole[]>([]);
  public readonly avatarUrl = signal<string | null>(null);
  public readonly fullName = signal<string>('');

  private initialRoleIds: string[] = [];

  // --- Definición del Formulario Reactivo con Validadores Espejo del Backend ---
  public readonly form = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(255)],
    ],
    firstName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    ],
    lastName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    ],
    phone: ['', [Validators.maxLength(30)]],
    roleIds: this.fb.control<string[]>([], [this.minRolesValidator(1)]),
  });

  ngOnInit(): void {
    // 1. Cargar catálogo de roles disponibles
    this.loadRoles();

    // 2. Determinar si estamos en modo edición según el parámetro de ruta :id
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.userId.set(idParam);
      // El email no es modificable en modo edición por contrato del backend
      this.form.controls.email.disable();
      this.loadUserDetail(idParam);
    }
  }

  private loadRoles(): void {
    this.usersService
      .listActiveRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.availableRoles.set(roles);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los roles del sistema.');
        },
      });
  }

  private loadUserDetail(id: string): void {
    this.isLoading.set(true);
    this.usersService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user: User) => {
          this.isLoading.set(false);
          this.avatarUrl.set(user.avatarUrl);
          this.fullName.set(user.fullName || `${user.firstName} ${user.lastName}`.trim());
          const roleIds = user.roles ? user.roles.map((r) => r.id) : [];
          this.initialRoleIds = [...roleIds];

          this.form.patchValue({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? '',
            roleIds,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg =
            err.status === 404
              ? 'El usuario solicitado no existe o fue eliminado.'
              : 'Ocurrió un error al cargar la información del usuario.';
          this.errorMessage.set(msg);
        },
      });
  }

  public isRoleSelected(roleId: string): boolean {
    const current = this.form.controls.roleIds.value ?? [];
    return current.includes(roleId);
  }

  public toggleRole(roleId: string): void {
    const current = [...(this.form.controls.roleIds.value ?? [])];
    const index = current.indexOf(roleId);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(roleId);
    }

    this.form.controls.roleIds.setValue(current);
    this.form.controls.roleIds.markAsDirty();
    this.form.controls.roleIds.markAsTouched();
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);

    if (this.isEditMode()) {
      this.handleEditSubmit();
    } else {
      this.handleCreateSubmit();
    }
  }

  private handleCreateSubmit(): void {
    const rawValue = this.form.getRawValue();
    const payload: CreateUserRequest = {
      email: rawValue.email!.trim().toLowerCase(),
      firstName: rawValue.firstName!.trim(),
      lastName: rawValue.lastName!.trim(),
      phone: rawValue.phone?.trim() ? rawValue.phone.trim() : null,
      roleIds: rawValue.roleIds ?? [],
    };

    this.isSubmitting.set(true);

    this.usersService
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          // Abrir diálogo con la contraseña temporal de un solo uso
          const dialogRef = this.dialog.open(CredentialsDialogComponent, {
            data: {
              email: res.email,
              temporaryPassword: res.temporaryPassword,
              emailSent: res.emailSent,
            },
            disableClose: true,
            maxWidth: '480px',
            width: '90vw',
          });

          dialogRef.afterClosed().subscribe(() => {
            this.router.navigate(['/admin/users']);
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al crear el usuario.');
        },
      });
  }

  private handleEditSubmit(): void {
    const id = this.userId();
    if (!id) return;

    const currentRoles = this.form.controls.roleIds.value ?? [];
    const rolesChanged =
      currentRoles.length !== this.initialRoleIds.length ||
      !currentRoles.every((r) => this.initialRoleIds.includes(r));

    if (rolesChanged) {
      // Advertencia al usuario: PATCH /users/:id reemplaza todos los roles asignados
      const confirmRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Confirmar reemplazo de roles',
          message:
            'Al guardar los cambios se reemplazarán todos los roles asignados a este usuario por la selección actual.\n\n¿Deseas continuar y guardar los cambios?',
          confirmText: 'Guardar y Reemplazar',
          cancelText: 'Revisar',
          isDestructive: false,
        },
        maxWidth: '440px',
        width: '90vw',
      });

      confirmRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.executePatch(id);
        }
      });
    } else {
      this.executePatch(id);
    }
  }

  private executePatch(id: string): void {
    const rawValue = this.form.getRawValue();
    const payload: UpdateUserRequest = {
      firstName: rawValue.firstName!.trim(),
      lastName: rawValue.lastName!.trim(),
      phone: rawValue.phone?.trim() ? rawValue.phone.trim() : null,
      roleIds: rawValue.roleIds ?? [],
    };

    this.isSubmitting.set(true);

    this.usersService
      .update(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackBar.open('Usuario actualizado exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.router.navigate(['/admin/users']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al actualizar el usuario.');
        },
      });
  }

  private handleHttpError(err: HttpErrorResponse, defaultMsg: string): void {
    const msg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message ?? defaultMsg;

    this.errorMessage.set(msg);
  }

  private minRolesValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val || !Array.isArray(val) || val.length < min) {
        return { minRoles: { required: min, actual: val ? val.length : 0 } };
      }
      return null;
    };
  }

  public getUserInitials(): string {
    const name = this.fullName() || this.form.controls.firstName.value || '';
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  public openAvatarDialog(): void {
    const currentId = this.userId();
    if (!currentId) return;

    const dialogRef = this.dialog.open(AvatarUploadDialogComponent, {
      data: {
        avatarUrl: this.avatarUrl(),
        userId: currentId,
        userName: this.fullName(),
      },
      panelClass: 'avatar-dialog-panel',
      autoFocus: false,
      maxWidth: '460px',
      width: '100%',
    });

    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        this.snackBar.open('Avatar del usuario actualizado correctamente.', 'Entendido', {
          duration: 3500,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
        });
        this.loadUserDetail(currentId);
      }
    });
  }
}
