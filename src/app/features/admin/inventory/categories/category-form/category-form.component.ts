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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import {
  Category,
  CategoryChild,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../../../../core/models/category.models';
import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CategoryImageDialogComponent } from '../dialogs/category-image-dialog/category-image-dialog.component';
import { FormActionsDockComponent } from '../../../../../shared/components/form-actions-dock/form-actions-dock.component';

/**
 * Convierte una cadena de texto en un slug URL-friendly normalizado.
 */
function slugify(text: string): string {
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

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTooltipModule,
    HasPermissionDirective,
    FormActionsDockComponent,
  ],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(CategoriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado ---
  public readonly isEditMode = signal<boolean>(false);
  public readonly categoryId = signal<string | null>(null);
  public readonly category = signal<Category | null>(null);
  public readonly subcategories = signal<CategoryChild[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly allParents = signal<CategoryChild[]>([]);
  public readonly isCustomSlug = signal<boolean>(false);
  public readonly isImageBroken = signal<boolean>(false);
  public readonly brokenChildImageIds = signal<Set<string>>(new Set());

  // --- Lista de padres filtrada para prevenir ciclos jerárquicos ---
  public readonly availableParents = computed<CategoryChild[]>(() => {
    const parents = this.allParents();
    const currentId = this.categoryId();

    if (!currentId) {
      return parents;
    }

    // Excluir la categoría actual y sus hijos descendientes inmediatos
    const childIds = new Set(this.subcategories().map((c) => c.id));
    return parents.filter(
      (cat) => cat.id !== currentId && !childIds.has(cat.id) && cat.parentId !== currentId
    );
  });

  // --- Formulario reactivo con validadores espejo del backend ---
  public readonly form = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    slug: [
      '',
      [
        Validators.maxLength(120),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    ],
    description: ['', [Validators.maxLength(500)]],
    parentId: [null as string | null],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    // 1. Cargar catálogo de categorías superiores (padres)
    this.loadParents();

    // 2. Comprobar si estamos en modo edición por parámetro :id de ruta
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.categoryId.set(idParam);
      this.isCustomSlug.set(true);
      this.loadCategoryDetail(idParam);
    } else {
      // Modo creación: preseleccionar parentId si viene como queryParam (ej. desde botón de agregar subcategoría)
      const parentIdQuery = this.route.snapshot.queryParams['parentId'];
      if (parentIdQuery) {
        this.form.controls.parentId.setValue(parentIdQuery);
      }

      // Autogenerar slug en tiempo real mientras el usuario escribe el nombre
      this.form.controls.name.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((name) => {
          if (!this.isCustomSlug()) {
            this.form.controls.slug.setValue(slugify(name || ''), {
              emitEvent: false,
            });
          }
        });
    }
  }

  /**
   * Consulta las categorías disponibles para asignar como categoría padre.
   */
  public loadParents(): void {
    this.categoriesService
      .listParents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (parents) => {
          this.allParents.set(parents);
        },
        error: () => {
          // No bloquea la pantalla si falla la lista auxiliar de padres
        },
      });
  }

  /**
   * Carga el detalle completo de la categoría usando el endpoint GET /categories/:id,
   * el cual devuelve la categoría con su arreglo de `children` (subcategorías) y conteos.
   */
  public loadCategoryDetail(id: string): void {
    this.isLoading.set(true);
    this.isImageBroken.set(false);
    this.errorMessage.set(null);

    this.categoriesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cat: Category) => {
          this.isLoading.set(false);
          this.category.set(cat);
          this.subcategories.set(cat.children || []);

          this.form.patchValue({
            name: cat.name,
            slug: cat.slug,
            description: cat.description ?? '',
            parentId: cat.parentId ?? null,
            displayOrder: cat.displayOrder ?? 0,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg =
            err.status === 404
              ? 'La categoría solicitada no existe o fue eliminada del catálogo.'
              : 'Ocurrió un error al cargar la información de la categoría.';
          this.errorMessage.set(msg);
        },
      });
  }

  /**
   * Alterna entre el modo de slug autogenerado o personalizado por el usuario.
   */
  public toggleCustomSlug(): void {
    const nextState = !this.isCustomSlug();
    this.isCustomSlug.set(nextState);

    if (!nextState) {
      // Regenerar slug desde el valor actual del nombre
      const name = this.form.controls.name.value || '';
      this.form.controls.slug.setValue(slugify(name));
      this.form.controls.slug.markAsDirty();
    }
  }

  public isDirty(): boolean {
    return this.form.dirty;
  }

  public discard(): void {
    if (this.isEditMode() && this.category()) {
      const cat = this.category()!;
      this.form.reset({
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? '',
        parentId: cat.parentId ?? null,
        displayOrder: cat.displayOrder ?? 0,
      });
    } else {
      this.form.reset({
        name: '',
        slug: '',
        description: '',
        parentId: null,
        displayOrder: 0,
      });
    }
  }

  /**
   * Envía el formulario creando o actualizando la categoría.
   */
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
    const raw = this.form.getRawValue();
    const payload: CreateCategoryRequest = {
      name: raw.name!.trim(),
      slug: raw.slug?.trim() ? raw.slug.trim() : undefined,
      description: raw.description?.trim() ? raw.description.trim() : null,
      parentId: raw.parentId || null,
      displayOrder: Number(raw.displayOrder ?? 0),
    };

    this.isSubmitting.set(true);

    this.categoriesService
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Categoría "${created.name}" creada exitosamente.`,
            'Cerrar',
            {
              duration: 3500,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
          this.router.navigate(['/admin/inventory/categories']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'No se pudo crear la categoría.');
        },
      });
  }

  private handleEditSubmit(): void {
    const id = this.categoryId();
    if (!id) return;

    const raw = this.form.getRawValue();
    const payload: UpdateCategoryRequest = {
      name: raw.name!.trim(),
      slug: raw.slug?.trim() ? raw.slug.trim() : undefined,
      description: raw.description?.trim() ? raw.description.trim() : null,
      parentId: raw.parentId || null,
      displayOrder: Number(raw.displayOrder ?? 0),
    };

    this.isSubmitting.set(true);

    this.categoriesService
      .update(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.category.set(updated);
          this.snackBar.open('Categoría actualizada exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.router.navigate(['/admin/inventory/categories']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'No se pudo actualizar la categoría.');
        },
      });
  }

  private handleHttpError(err: HttpErrorResponse, defaultMsg: string): void {
    const msg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message ?? defaultMsg;

    if (err.status === 409) {
      // Conflicto de unicidad de slug
      this.form.controls.slug.setErrors({ serverConflict: msg });
      this.form.controls.slug.markAsTouched();
    } else {
      this.errorMessage.set(msg);
    }
  }

  /**
   * Abre el diálogo de carga y actualización de imagen en Cloudinary.
   */
  public openImageDialog(): void {
    const cat = this.category();
    if (!cat) return;

    const dialogRef = this.dialog.open(CategoryImageDialogComponent, {
      width: '460px',
      data: { category: cat },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Imagen de categoría actualizada.', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        if (this.categoryId()) {
          this.loadCategoryDetail(this.categoryId()!);
        }
      }
    });
  }

  /**
   * Abre el diálogo de actualización de imagen para una subcategoría hija.
   */
  public openChildImageDialog(child: CategoryChild): void {
    const dialogRef = this.dialog.open(CategoryImageDialogComponent, {
      width: '460px',
      data: { category: child },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && this.categoryId()) {
        this.loadCategoryDetail(this.categoryId()!);
      }
    });
  }

  /**
   * Navega a la pantalla de edición de una subcategoría hija.
   */
  public onEditSubcategory(child: CategoryChild): void {
    this.router.navigate(['/admin/inventory/categories', child.id, 'edit']);
  }

  /**
   * Alterna el estado activo/inactivo de una subcategoría hija con diálogo de confirmación.
   */
  public onToggleChildStatus(child: CategoryChild): void {
    const willBeActive = !child.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? '¿Activar subcategoría?' : '¿Desactivar subcategoría?',
        message: willBeActive
          ? `La subcategoría "${child.name}" volverá a estar disponible en el catálogo.`
          : `La subcategoría "${child.name}" dejará de ser visible para los clientes.`,
        confirmText: willBeActive ? 'Sí, activar' : 'Sí, desactivar',
        cancelText: 'Cancelar',
        icon: willBeActive ? 'check_circle' : 'block',
        isDestructive: !willBeActive,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.categoriesService
        .setStatus(child.id, willBeActive)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.snackBar.open(
              `Subcategoría ${res.isActive ? 'activada' : 'desactivada'} correctamente.`,
              'Cerrar',
              {
                duration: 3000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
            // Actualizar la lista local de subcategorías
            this.subcategories.update((list) =>
              list.map((c) => (c.id === child.id ? { ...c, isActive: res.isActive } : c))
            );
          },
          error: (err: HttpErrorResponse) => {
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message ?? 'No se pudo cambiar el estado.';

            if (err.status === 409) {
              this.dialog.open(ConfirmDialogComponent, {
                width: '460px',
                data: {
                  title: 'No se puede desactivar la subcategoría',
                  message: `${msg}\n\nDebes desvincular o archivar los productos vinculados antes de desactivarla.`,
                  confirmText: 'Entendido',
                  cancelText: 'Cerrar',
                  icon: 'warning',
                  isDestructive: false,
                },
              });
            } else {
              this.snackBar.open(msg, 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              });
            }
          },
        });
    });
  }

  /**
   * Resuelve el nombre legible de una categoría padre.
   */
  public getParentName(parentId: string | null): string {
    if (!parentId) return 'Nivel Raíz';
    const found = this.allParents().find((p) => p.id === parentId);
    return found ? found.name : 'Categoría Superior';
  }

  public onMainImageError(): void {
    this.isImageBroken.set(true);
  }

  public onChildImageError(childId: string): void {
    this.brokenChildImageIds.update((set) => {
      const updated = new Set(set);
      updated.add(childId);
      return updated;
    });
  }

  public isChildImageBroken(childId: string): boolean {
    return this.brokenChildImageIds().has(childId);
  }

  public copyCategoryId(): void {
    const id = this.categoryId();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      this.snackBar.open('ID copiado al portapapeles', 'Cerrar', {
        duration: 2500,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      });
    });
  }

  public get formattedCreatedAt(): string {
    const d = this.category()?.createdAt;
    if (!d) return 'No disponible';
    try {
      return new Date(d).toLocaleDateString('es-HN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  }

  public get formattedUpdatedAt(): string {
    const d = this.category()?.updatedAt;
    if (!d) return 'No disponible';
    try {
      return new Date(d).toLocaleDateString('es-HN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  }
}
