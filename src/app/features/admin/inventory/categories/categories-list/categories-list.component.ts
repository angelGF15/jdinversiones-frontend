import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  Injector,
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
import { of, combineLatest } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { CategoriesService } from '../../../../../core/services/categories.service';
import {
  CategoryChild,
  CategoryListQuery,
} from '../../../../../core/models/category.models';
import {
  DataTableColumn,
  FilterSelect,
  FilterToggle,
} from '../../../../../shared/models/data-table.models';
import {
  DataTableComponent,
  DataTableColumnDirective,
  ListFiltersComponent,
  PaginationComponent,
  ConfirmDialogComponent,
} from '../../../../../shared/components';
import { ListQueryState } from '../../../../../shared/utils/list-query-state';
import { CategoryFormDialogComponent, CategoryImageDialogComponent } from '../dialogs';

@Component({
  selector: 'app-categories-list',
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
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesListComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Gestor reactivo de estado de listado sincronizado con la URL (deep-linking). */
  public readonly queryState = new ListQueryState<CategoryListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<CategoryChild[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly brokenImageIds = signal<Set<string>>(new Set<string>());

  // --- Catálogo de Categorías Padre para Filtros y Mapeo Jerárquico ---
  public readonly parents = signal<CategoryChild[]>([]);

  /** Mapa en memoria de id -> nombre para resolver visualmente el padre sin peticiones adicionales */
  public readonly parentMap = computed(() => {
    const map = new Map<string, string>();
    for (const p of this.parents()) {
      map.set(p.id, p.name);
    }
    return map;
  });

  /** Opciones dinámicas para el dropdown de categorías superiores */
  public readonly parentFilters = computed<FilterSelect[]>(() => {
    const options = this.parents().map((p) => ({ value: p.id, label: p.name }));
    return [
      {
        key: 'parentId',
        label: 'Categoría superior',
        options,
        allowClear: true,
      },
    ];
  });

  /** Toggle booleano para filtrar solo categorías activas */
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activas' },
  ];

  /** Definición de columnas de la tabla de categorías */
  public readonly columns: DataTableColumn<CategoryChild>[] = [
    { key: 'imageUrl', header: 'Imagen', width: '80px', align: 'center' },
    { key: 'name', header: 'Categoría', width: '280px' },
    { key: 'parentId', header: 'Jerarquía', width: '220px' },
    { key: 'childrenCount', header: 'Subcategorías', width: '130px', align: 'center' },
    { key: 'productCount', header: 'Productos', width: '120px', align: 'center' },
    { key: 'displayOrder', header: 'Orden', width: '90px', align: 'center' },
    { key: 'isActive', header: 'Estado', width: '120px', align: 'center' },
    { header: 'Acciones', width: '150px', align: 'right', stickyEnd: true },
  ];

  private readonly reloadTrigger = signal<number>(0);

  ngOnInit(): void {
    // 1. Cargar categorías activas para poblar filtro jerárquico y resolver nombres de padres
    this.loadParentsCatalog();

    // 2. Conectar reactivamente los cambios de queryState hacia el servicio con switchMap anti-carreras
    combineLatest([
      toObservable(this.queryState.state, { injector: this.injector }),
      toObservable(this.reloadTrigger, { injector: this.injector }),
    ])
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap(([query]) =>
          this.categoriesService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el listado de categorías.';
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

  /**
   * Carga el catálogo de categorías activas para poblar el dropdown de filtrado por padre.
   */
  public loadParentsCatalog(): void {
    this.categoriesService
      .listParents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (parents) => {
          this.parents.set(parents);
        },
        error: () => {
          // Si falla la carga de padres, el listado general sigue funcionando
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
    this.reloadTrigger.update((v) => v + 1);
  }

  public isImageBroken(id: string): boolean {
    return this.brokenImageIds().has(id);
  }

  public onImageError(id: string): void {
    this.brokenImageIds.update((set) => {
      const updated = new Set(set);
      updated.add(id);
      return updated;
    });
  }

  /**
   * Resuelve el nombre de la categoría superior para mostrar en la celda jerárquica.
   */
  public getParentName(parentId: string | null): string {
    if (!parentId) return 'Principal (Raíz)';
    const fromMap = this.parentMap().get(parentId);
    if (fromMap) return fromMap;
    const fromItems = this.items().find((i) => i.id === parentId)?.name;
    return fromItems ?? 'Subcategoría';
  }

  /**
   * Apertura del diálogo para crear una nueva categoría (Fase 4).
   */
  public onNewCategory(): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '520px',
      data: {
        mode: 'create',
        parents: this.parents(),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.retry();
          this.loadParentsCatalog();
        }
      });
  }

  /**
   * Apertura del diálogo para editar una categoría existente (Fase 4).
   */
  public onEditCategory(category: CategoryChild): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '520px',
      data: {
        mode: 'edit',
        category,
        parents: this.parents(),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.retry();
          this.loadParentsCatalog();
        }
      });
  }

  /**
   * Apertura del diálogo de subida de imagen a Cloudinary (Fase 5).
   */
  public onUpdateImage(category: CategoryChild): void {
    const dialogRef = this.dialog.open(CategoryImageDialogComponent, {
      width: '460px',
      data: { category },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedCategory: CategoryChild | null) => {
        if (updatedCategory) {
          this.brokenImageIds.update((set) => {
            const next = new Set(set);
            next.delete(updatedCategory.id);
            return next;
          });

          this.items.update((list) =>
            list.map((item) =>
              item.id === updatedCategory.id
                ? { ...item, imageUrl: updatedCategory.imageUrl }
                : item
            )
          );
        }
      });
  }

  /**
   * Cambia el estado activo/inactivo de la categoría previa confirmación modal.
   * Maneja errores 409 Conflict si posee productos activos asociados (Fase 6).
   */
  public onToggleStatus(category: CategoryChild): void {
    const willBeActive = !category.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? 'Activar categoría' : 'Desactivar categoría',
        message: willBeActive
          ? `¿Estás seguro de reactivar la categoría "${category.name}"? Volverá a estar disponible para asociar productos.`
          : `¿Estás seguro de desactivar la categoría "${category.name}"? Los productos no podrán asociarse a categorías inactivas.`,
        confirmText: willBeActive ? 'Activar' : 'Desactivar',
        cancelText: 'Cancelar',
        isDestructive: !willBeActive,
        icon: willBeActive ? 'check_circle' : 'warning',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.categoriesService.setStatus(category.id, willBeActive).subscribe({
          next: (updated) => {
            this.items.update((list) =>
              list.map((item) =>
                item.id === updated.id ? { ...item, isActive: updated.isActive } : item
              )
            );
            this.snackBar.open(
              `La categoría "${category.name}" ha sido ${
                willBeActive ? 'activada' : 'desactivada'
              } exitosamente.`,
              'Cerrar',
              { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' }
            );
          },
          error: (err: HttpErrorResponse) => {
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message ?? 'No se pudo actualizar el estado de la categoría.';

            if (err.status === 409) {
              this.dialog.open(ConfirmDialogComponent, {
                width: '460px',
                data: {
                  title: 'No se puede desactivar la categoría',
                  message: `${msg}\n\nDebes desvincular o archivar los productos vinculados antes de poder desactivar esta categoría del catálogo.`,
                  confirmText: 'Entendido',
                  cancelText: 'Cerrar',
                  icon: 'warning',
                  isDestructive: false,
                },
              });
            } else {
              this.snackBar.open(msg, 'Cerrar', {
                duration: 5000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              });
            }
          },
        });
      });
  }
}
