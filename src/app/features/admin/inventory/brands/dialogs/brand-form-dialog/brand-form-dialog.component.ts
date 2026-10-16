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
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BrandsService } from '../../../../../../core/services/brands/brands.service';
import {
  CatalogBrand,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '../../../../../../core/models/brand.models';

export interface BrandFormData {
  mode: 'create' | 'edit';
  brand?: CatalogBrand;
}

/**
 * Convierte un texto a slug limpio en minúsculas sin acentos ni caracteres especiales
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Component({
  selector: 'app-brand-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './brand-form-dialog.component.html',
  styleUrls: ['./brand-form-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BrandFormDialogComponent>);
  private readonly brandsService = inject(BrandsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  public readonly data: BrandFormData = inject(MAT_DIALOG_DATA, { optional: true }) ?? { mode: 'create' };

  public readonly isEdit = this.data.mode === 'edit';
  public readonly isSubmitting = signal<boolean>(false);
  public readonly serverErrorMessage = signal<string | null>(null);

  /** Indica si el usuario ha editado manualmente el slug para no sobrescribirlo */
  public readonly isManualSlug = signal<boolean>(this.isEdit);

  public readonly form = this.fb.group({
    name: [
      this.data.brand?.name ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    ],
    slug: [
      this.data.brand?.slug ?? '',
      [Validators.maxLength(100), Validators.pattern(SLUG_PATTERN)],
    ],
  });

  ngOnInit(): void {
    // 1. Generación automática de slug a partir del nombre (solo si no es manual)
    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nameVal) => {
        if (!this.isManualSlug()) {
          const generated = slugify(nameVal ?? '');
          this.form.controls.slug.setValue(generated, { emitEvent: false });
        }

        // Limpiar error de conflicto 409 previo en name si existía
        if (this.form.controls.name.hasError('serverConflict')) {
          this.clearFieldError('name');
        }
      });

    // 2. Limpiar error de conflicto en slug al cambiar su valor
    this.form.controls.slug.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.slug.hasError('serverConflict')) {
          this.clearFieldError('slug');
        }
      });
  }

  /**
   * Marca el slug como editado manualmente por el usuario
   */
  public onSlugManualInput(): void {
    this.isManualSlug.set(true);
  }

  /**
   * Restablece la sincronización automática del slug regenerándolo desde el nombre actual
   */
  public resetAutoSlug(): void {
    this.isManualSlug.set(false);
    const generated = slugify(this.form.controls.name.value ?? '');
    this.form.controls.slug.setValue(generated);
    this.form.controls.slug.markAsDirty();
  }

  /**
   * Envía el formulario creando o editando la marca en el backend
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
    const slug = raw.slug?.trim() ? raw.slug.trim() : undefined;

    if (this.isEdit && this.data.brand) {
      const updatePayload: UpdateBrandRequest = {
        name,
        slug,
      };

      this.brandsService.update(this.data.brand.id, updatePayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Marca "${saved.name}" actualizada exitosamente`,
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
      const createPayload: CreateBrandRequest = {
        name,
        slug,
      };

      this.brandsService.create(createPayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Marca "${saved.name}" registrada exitosamente`,
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

  private clearFieldError(controlName: 'name' | 'slug'): void {
    const control = this.form.controls[controlName];
    if (control.errors) {
      const errors = { ...control.errors };
      delete errors['serverConflict'];
      const hasRemaining = Object.keys(errors).length > 0;
      control.setErrors(hasRemaining ? errors : null);
    }
  }

  private handleHttpError(err: HttpErrorResponse): void {
    this.isSubmitting.set(false);
    const msg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message ?? 'Ocurrió un error al procesar la solicitud.';

    if (err.status === 409) {
      const lower = msg.toLowerCase();
      if (lower.includes('slug')) {
        this.form.controls.slug.setErrors({ serverConflict: msg });
        this.form.controls.slug.markAsTouched();
      } else if (lower.includes('nombre') || lower.includes('name')) {
        this.form.controls.name.setErrors({ serverConflict: msg });
        this.form.controls.name.markAsTouched();
      } else {
        this.serverErrorMessage.set(msg);
      }
    } else {
      this.serverErrorMessage.set(msg);
    }
  }
}
