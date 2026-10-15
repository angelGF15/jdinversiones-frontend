import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AttributesService } from '../../../../../../core/services/attributes.service';
import {
  CatalogAttribute,
  CreateAttributeRequest,
  UpdateAttributeRequest,
} from '../../../../../../core/models/attribute.models';

export interface AttributeFormData {
  mode: 'create' | 'edit';
  attribute?: CatalogAttribute;
}

@Component({
  selector: 'app-attribute-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './attribute-form-dialog.component.html',
  styleUrls: ['./attribute-form-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AttributeFormDialogComponent>);
  private readonly attributesService = inject(AttributesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  public readonly data: AttributeFormData = inject(MAT_DIALOG_DATA);

  public readonly isEdit = this.data.mode === 'edit';
  public readonly isSubmitting = signal<boolean>(false);
  public readonly serverErrorMessage = signal<string | null>(null);

  /** Sugerencias visuales comunes para agilizar el llenado en modo creación. */
  public readonly commonSuggestions: string[] = [
    'Color',
    'Talla',
    'Capacidad',
    'Memoria RAM',
    'Almacenamiento',
    'Material',
    'Voltaje',
  ];

  public readonly form = this.fb.group({
    name: [
      this.data.attribute?.name ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    displayOrder: [
      this.data.attribute?.displayOrder ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    description: [
      this.data.attribute?.description ?? '',
      [Validators.maxLength(500)],
    ],
  });

  ngOnInit(): void {
    // Si el campo de nombre cambia, limpiar cualquier error de conflicto 409 previo
    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.name.hasError('serverConflict')) {
          const errors = { ...this.form.controls.name.errors };
          delete errors['serverConflict'];
          const hasRemaining = Object.keys(errors).length > 0;
          this.form.controls.name.setErrors(hasRemaining ? errors : null);
        }
      });
  }

  /**
   * Aplica una sugerencia predefinida directamente en el campo de nombre.
   */
  public applySuggestion(suggestion: string): void {
    this.form.controls.name.setValue(suggestion);
    this.form.controls.name.markAsDirty();
    this.form.controls.name.markAsTouched();
  }

  /**
   * Envía el formulario creando o actualizando el atributo en el backend.
   * Maneja errores 409 Conflict mapeando el mensaje directamente al campo `name`.
   */
  public onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.serverErrorMessage.set(null);

    const raw = this.form.getRawValue();
    const name = raw.name!.trim();
    const description = raw.description?.trim() ? raw.description.trim() : null;
    const displayOrder = Number(raw.displayOrder ?? 0);

    if (this.isEdit && this.data.attribute) {
      const updatePayload: UpdateAttributeRequest = {
        name,
        description,
        displayOrder,
      };

      this.attributesService.update(this.data.attribute.id, updatePayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Atributo "${saved.name}" actualizado exitosamente`,
            'Cerrar',
            { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' }
          );
          this.dialogRef.close(saved);
        },
        error: (err: HttpErrorResponse) => {
          this.handleHttpError(err);
        },
      });
    } else {
      const createPayload: CreateAttributeRequest = {
        name,
        description,
        displayOrder,
      };

      this.attributesService.create(createPayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Atributo "${saved.name}" registrado exitosamente`,
            'Cerrar',
            { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' }
          );
          this.dialogRef.close(saved);
        },
        error: (err: HttpErrorResponse) => {
          this.handleHttpError(err);
        },
      });
    }
  }

  public onCancel(): void {
    this.dialogRef.close(null);
  }

  private handleHttpError(err: HttpErrorResponse): void {
    this.isSubmitting.set(false);
    const msg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message ?? 'Ocurrió un error al procesar la solicitud.';

    if (err.status === 409) {
      this.form.controls.name.setErrors({ serverConflict: msg });
      this.form.controls.name.markAsTouched();
    } else {
      this.serverErrorMessage.set(msg);
    }
  }
}
