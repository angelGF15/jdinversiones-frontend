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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CategoriesService } from '../../../../../../core/services/categories.service';
import {
  Category,
  CategoryChild,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../../../../../core/models/category.models';

export interface CategoryFormData {
  mode: 'create' | 'edit';
  category?: CategoryChild | Category;
  parents?: CategoryChild[];
}

/**
 * Convierte un texto a slug válido para URLs:
 * - Minúsculas
 * - Sin tildes ni caracteres diacríticos
 * - Guiones intermedios sin repetición ni bordes
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './category-form-dialog.component.html',
  styleUrls: ['./category-form-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialogComponent>);
  private readonly categoriesService = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  public readonly data: CategoryFormData = inject(MAT_DIALOG_DATA);

  public readonly isEdit = this.data.mode === 'edit';
  public readonly isSubmitting = signal<boolean>(false);
  public readonly serverErrorMessage = signal<string | null>(null);

  /** Indica si el usuario decidió editar el slug manualmente */
  public readonly isCustomSlug = signal<boolean>(false);

  /** Lista base de categorías padre provista o consultada */
  public readonly parentsList = signal<CategoryChild[]>(this.data.parents ?? []);

  /**
   * Filtra las opciones de categoría superior para prevenir ciclos en el árbol:
   * 1. Excluye la categoría actual.
   * 2. Excluye cualquier hijo descendiente directo conocido.
   */
  public readonly availableParents = computed<CategoryChild[]>(() => {
    const all = this.parentsList();
    if (!this.isEdit || !this.data.category) {
      return all;
    }

    const currentId = this.data.category.id;
    const directChildIds = new Set(
      (this.data.category as Category).children?.map((c) => c.id) ?? []
    );

    return all.filter((cat) => {
      if (cat.id === currentId) return false;
      if (directChildIds.has(cat.id)) return false;
      if (cat.parentId === currentId) return false;
      return true;
    });
  });

  public readonly form = this.fb.group({
    name: [
      this.data.category?.name ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    slug: [
      this.data.category?.slug ?? '',
      [Validators.maxLength(120), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    parentId: [this.data.category?.parentId ?? null],
    displayOrder: [
      this.data.category?.displayOrder ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    description: [
      this.data.category?.description ?? '',
      [Validators.maxLength(500)],
    ],
  });

  ngOnInit(): void {
    // Si estamos editando y ya tiene slug, se marca como personalizado si difiere de autogenerado
    if (this.isEdit && this.data.category?.slug) {
      this.isCustomSlug.set(true);
    }

    // Si el nombre cambia y el slug no ha sido personalizado, autogenerar el slug
    this.form.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nameVal) => {
        if (!this.isCustomSlug()) {
          const generated = slugify(nameVal ?? '');
          this.form.controls.slug.setValue(generated, { emitEvent: false });
        }
      });

    // Limpiar error de conflicto 409 al modificar el slug
    this.form.controls.slug.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.slug.hasError('serverConflict')) {
          const errors = { ...this.form.controls.slug.errors };
          delete errors['serverConflict'];
          const hasRemaining = Object.keys(errors).length > 0;
          this.form.controls.slug.setErrors(hasRemaining ? errors : null);
        }
      });

    // Si no se pasaron categorías padre en la data del diálogo, cargarlas del servicio
    if (this.parentsList().length === 0) {
      this.categoriesService
        .listParents()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (parents) => this.parentsList.set(parents),
          error: () => {},
        });
    }
  }

  /**
   * Alterna la personalización manual del slug.
   */
  public toggleCustomSlug(): void {
    const nextState = !this.isCustomSlug();
    this.isCustomSlug.set(nextState);

    if (!nextState) {
      const generated = slugify(this.form.controls.name.value ?? '');
      this.form.controls.slug.setValue(generated);
    }
  }

  /**
   * Envía el formulario creando o editando la categoría en el backend.
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
    const slugTrimmed = raw.slug?.trim();
    const slug = slugTrimmed !== '' ? slugTrimmed : undefined;
    const description = raw.description?.trim() ? raw.description.trim() : null;
    const parentId = raw.parentId ? raw.parentId : null;
    const displayOrder = Number(raw.displayOrder ?? 0);

    if (this.isEdit && this.data.category) {
      const updatePayload: UpdateCategoryRequest = {
        name,
        slug,
        description,
        parentId,
        displayOrder,
      };

      this.categoriesService.update(this.data.category.id, updatePayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Categoría "${saved.name}" actualizada exitosamente`,
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
      const createPayload: CreateCategoryRequest = {
        name,
        slug,
        description,
        parentId,
        displayOrder,
      };

      this.categoriesService.create(createPayload).subscribe({
        next: (saved) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Categoría "${saved.name}" registrada exitosamente`,
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

    if (err.status === 409 && (msg.toLowerCase().includes('slug') || msg.toLowerCase().includes('categoría registrada'))) {
      this.form.controls.slug.setErrors({ serverConflict: msg });
      this.form.controls.slug.markAsTouched();
    } else {
      this.serverErrorMessage.set(msg);
    }
  }
}
