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
import { MatMenuModule } from '@angular/material/menu';
import { of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { ProductsService } from '../../../../../core/services/products/products.service';
import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import {
  ProductListItem,
  ProductListQuery,
  ProductStatus,
} from '../../../../../core/models/product.models';
import { CategoryChild } from '../../../../../core/models/category.models';
import { CatalogBrand } from '../../../../../core/models/brand.models';
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

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTooltipModule,
    MatMenuModule,
    HasPermissionDirective,
    DataTableComponent,
    DataTableColumnDirective,
    ListFiltersComponent,
    PaginationComponent,
  ],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsListComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly brandsService = inject(BrandsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Gestor reactivo de estado de listado sincronizado con la URL (deep-linking). */
  public readonly queryState = new ListQueryState<ProductListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<ProductListItem[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly isExporting = signal<boolean>(false);
  public readonly exportingFormat = signal<'xlsx' | 'csv' | null>(null);
  public readonly errorMessage = signal<string | null>(null);
  private readonly brokenImageIds = signal<Set<string>>(new Set<string>());

  // --- Catálogos para Filtros ---
  public readonly categories = signal<CategoryChild[]>([]);
  public readonly brands = signal<CatalogBrand[]>([]);
  public readonly statuses = signal<ProductStatus[]>([]);

  /** Selectores combinados de Categoría, Marca y Estado para app-list-filters */
  public readonly selectFilters = computed<FilterSelect[]>(() => {
    const categoryOptions = this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));

    const brandOptions = this.brands().map((b) => ({
      value: b.id,
      label: b.name,
    }));

    const statusOptions = this.statuses().map((s) => ({
      value: s.code,
      label: this.getStatusLabel(s.code, s.name),
    }));

    return [
      {
        key: 'categoryId',
        label: 'Categoría',
        options: categoryOptions,
        allowClear: true,
      },
      {
        key: 'brandId',
        label: 'Marca',
        options: brandOptions,
        allowClear: true,
      },
      {
        key: 'statusCode',
        label: 'Estado',
        options: statusOptions,
        allowClear: true,
      },
    ];
  });

  /** Switch booleano para filtrar solo productos destacados */
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isFeatured', label: 'Solo destacados' },
  ];

  /** Definición de columnas para app-data-table */
  public readonly columns: DataTableColumn<ProductListItem>[] = [
    { key: 'primaryImageUrl', header: 'Imagen', width: '80px', align: 'center' },
    { key: 'sku', header: 'SKU', width: '140px' },
    { key: 'name', header: 'Producto', width: '280px' },
    { key: 'categoryName', header: 'Categoría', width: '170px' },
    { key: 'brandName', header: 'Marca', width: '150px' },
    { key: 'price', header: 'Precio (LPS)', type: 'currency', width: '155px', align: 'right' },
    { key: 'statusCode', header: 'Estado', width: '130px', align: 'center' },
    { header: 'Acciones', width: '140px', align: 'right', stickyEnd: true },
  ];

  ngOnInit(): void {
    // 1. Cargar catálogos maestros para poblar los filtros desplegables
    this.loadFilterCatalogs();

    // 2. Conectar reactivamente los cambios de queryState hacia ProductsService con switchMap anti-carreras
    toObservable(this.queryState.state, { injector: this.injector })
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((query) =>
          this.productsService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el catálogo de productos.';
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

  private loadFilterCatalogs(): void {
    this.categoriesService
      .listParents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => this.categories.set(cats),
        error: () => {},
      });

    this.brandsService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brands) => this.brands.set(brands),
        error: () => {},
      });

    this.productsService
      .listStatuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (statuses) => this.statuses.set(statuses),
        error: () => {},
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

  public isImageBroken(productId: string): boolean {
    return this.brokenImageIds().has(productId);
  }

  public onImageError(productId: string): void {
    this.brokenImageIds.update((set) => {
      const updated = new Set(set);
      updated.add(productId);
      return updated;
    });
  }

  /**
   * Traduce el código de estado a una etiqueta legible en español.
   */
  public getStatusLabel(statusCode: string, fallbackName?: string): string {
    const normalized = (statusCode || '').toLowerCase();
    if (normalized === 'active') return 'Activo';
    if (normalized === 'draft') return 'Borrador';
    if (normalized === 'inactive') return 'Inactivo';
    return fallbackName || statusCode;
  }

  /**
   * Calcula el porcentaje de margen bruto referencial si el producto tiene precio y costo válidos.
   */
  public getGrossMarginPercent(product: ProductListItem): number | null {
    if (
      product.costPrice === null ||
      product.costPrice === undefined ||
      product.price <= 0
    ) {
      return null;
    }
    return ((product.price - product.costPrice) / product.price) * 100;
  }

  public onNewProduct(): void {
    this.router.navigate(['/admin/inventory/products/new']);
  }

  public onEditProduct(product: ProductListItem): void {
    this.router.navigate(['/admin/inventory/products', product.id, 'edit']);
  }

  /**
   * Cambia el estado de un producto previa confirmación modal.
   * Actualiza reactivamente el signal local `items` sin recargar toda la página.
   */
  public onToggleStatus(product: ProductListItem, targetStatusCode?: string): void {
    const currentCode = (product.statusCode || '').toLowerCase();
    const nextStatus = targetStatusCode
      ? targetStatusCode.toLowerCase()
      : currentCode === 'active'
        ? 'inactive'
        : 'active';

    if (nextStatus === currentCode) return;

    const isActivating = nextStatus === 'active';
    const isDraft = nextStatus === 'draft';

    const title = isActivating
      ? 'Activar producto'
      : isDraft
        ? 'Mover producto a borrador'
        : 'Desactivar producto';

    const message = isActivating
      ? `¿Deseas activar el producto "${product.name}" (${product.sku})? Quedará visible y disponible en el catálogo comercial.`
      : isDraft
        ? `¿Deseas pasar el producto "${product.name}" (${product.sku}) a estado Borrador? Se ocultará temporalmente de la tienda mientras se edita.`
        : `¿Deseas desactivar el producto "${product.name}" (${product.sku})? Dejará de mostrarse en el catálogo público.`;

    const confirmText = isActivating
      ? 'Activar'
      : isDraft
        ? 'Pasar a Borrador'
        : 'Desactivar';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title,
        message,
        confirmText,
        cancelText: 'Cancelar',
        isDestructive: nextStatus === 'inactive',
        icon: isActivating ? 'check_circle' : isDraft ? 'edit_note' : 'block',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.productsService.setStatus(product.id, nextStatus).subscribe({
          next: (updatedProduct) => {
            this.items.update((products) =>
              products.map((p) =>
                p.id === product.id
                  ? {
                      ...p,
                      statusCode: updatedProduct.statusCode,
                      statusId: updatedProduct.statusId,
                    }
                  : p
              )
            );

            const statusLabel = this.getStatusLabel(updatedProduct.statusCode).toLowerCase();
            this.snackBar.open(
              `Producto "${product.name}" actualizado a ${statusLabel} exitosamente`,
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
              : err?.error?.message ?? 'Ocurrió un error al cambiar el estado del producto.';
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
   * Exporta el listado completo filtrado a Excel (.xlsx) o CSV (.csv) sin límite de paginación.
   */
  public onExport(format: 'xlsx' | 'csv' = 'xlsx'): void {
    if (this.isExporting()) return;

    this.isExporting.set(true);
    this.exportingFormat.set(format);

    this.productsService
      .export(this.queryState.state(), format)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ blob, filename }) => {
          this.isExporting.set(false);
          this.exportingFormat.set(null);
          this.triggerFileDownload(blob, filename);

          this.snackBar.open('Listado de productos exportado exitosamente', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isExporting.set(false);
          this.exportingFormat.set(null);
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'No se pudo exportar el catálogo de productos.';
          this.snackBar.open(errorMsg, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
  }

  /**
   * Dispara la descarga del archivo binario en el navegador mediante un enlace temporal.
   */
  public triggerFileDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || !window.URL?.createObjectURL) return;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
