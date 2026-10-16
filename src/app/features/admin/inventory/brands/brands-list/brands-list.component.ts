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
import { of, combineLatest } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import {
  CatalogBrand,
  BrandListQuery,
} from '../../../../../core/models/brand.models';
import {
  DataTableColumn,
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
import { BrandFormDialogComponent } from '../dialogs/brand-form-dialog/brand-form-dialog.component';

@Component({
  selector: 'app-brands-list',
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
  templateUrl: './brands-list.component.html',
  styleUrls: ['./brands-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsListComponent implements OnInit {
  private readonly brandsService = inject(BrandsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Gestor reactivo de estado sincronizado con la URL (deep-linking de filtros y paginación) */
  public readonly queryState = new ListQueryState<BrandListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 20,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<CatalogBrand[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly brokenImageIds = signal<Set<string>>(new Set<string>());

  /** Toggle booleano para filtrar únicamente marcas activas */
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activas' },
  ];

  /** Definición de columnas de la tabla de marcas */
  public readonly columns: DataTableColumn<CatalogBrand>[] = [
    { key: 'logoUrl', header: 'Logo', width: '80px', align: 'center' },
    { key: 'name', header: 'Marca', width: '280px' },
    { key: 'productCount', header: 'Productos', width: '130px', align: 'center' },
    { key: 'createdAt', header: 'Fecha de Registro', width: '170px', align: 'center', type: 'date' },
    { key: 'isActive', header: 'Estado', width: '130px', align: 'center' },
    { header: 'Acciones', width: '150px', align: 'right', stickyEnd: true },
  ];

  private readonly reloadTrigger = signal<number>(0);

  ngOnInit(): void {
    // Conectar reactivamente los cambios de queryState hacia BrandsService con switchMap anti-carreras
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
          this.brandsService.list(query).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el listado de marcas.';
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
   * Genera las iniciales del nombre de la marca como avatar tipográfico de respaldo
   */
  public getInitials(name: string): string {
    if (!name) return '??';
    const clean = name.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  /**
   * Apertura del diálogo para crear una nueva marca (se enlazará a BrandFormDialog en Fase 4)
   */
  public onNewBrand(): void {
    this.openBrandFormDialog();
  }

  /**
   * Apertura del diálogo para editar una marca existente (se enlazará a BrandFormDialog en Fase 4)
   */
  public onEditBrand(brand: CatalogBrand): void {
    this.openBrandFormDialog(brand);
  }

  /**
   * Apertura del diálogo para actualizar logotipo (se enlazará a BrandLogoDialog en Fase 5)
   */
  public onUpdateLogo(brand: CatalogBrand): void {
    this.openBrandLogoDialog(brand);
  }

  /**
   * Apertura del diálogo para crear o editar una marca comercial (Fase 4)
   */
  public openBrandFormDialog(brand?: CatalogBrand): void {
    const dialogRef = this.dialog.open(BrandFormDialogComponent, {
      width: '480px',
      data: {
        mode: brand ? 'edit' : 'create',
        brand,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((savedBrand: CatalogBrand | null) => {
        if (!savedBrand) return;

        if (brand) {
          this.items.update((list) =>
            list.map((item) => (item.id === savedBrand.id ? savedBrand : item))
          );
        } else {
          this.items.update((list) => [savedBrand, ...list]);
          this.total.update((t) => t + 1);
        }
      });
  }

  /**
   * Hook para diálogo de subida de logotipo a Cloudinary (Fase 5)
   */
  public openBrandLogoDialog(brand: CatalogBrand): void {
    // Gancho preparado para Fase 5 (BrandLogoDialogComponent)
  }

  /**
   * Cambia el estado activo/inactivo de la marca previa confirmación modal.
   * Maneja errores 409 Conflict si la marca tiene productos activos asociados (Fase 6).
   */
  public onToggleStatus(brand: CatalogBrand): void {
    const willBeActive = !brand.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? 'Activar marca' : 'Desactivar marca',
        message: willBeActive
          ? `¿Estás seguro de reactivar la marca "${brand.name}"? Volverá a estar disponible para asociar productos.`
          : `¿Estás seguro de desactivar la marca "${brand.name}"? Los productos no podrán asociarse a marcas inactivas.`,
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

        this.brandsService.setStatus(brand.id, willBeActive).subscribe({
          next: (updated) => {
            this.items.update((list) =>
              list.map((item) =>
                item.id === updated.id ? { ...item, isActive: updated.isActive } : item
              )
            );
            this.snackBar.open(
              `La marca "${brand.name}" ha sido ${
                willBeActive ? 'activada' : 'desactivada'
              } exitosamente.`,
              'Cerrar',
              { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' }
            );
          },
          error: (err: HttpErrorResponse) => {
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message ?? 'No se pudo actualizar el estado de la marca.';

            if (err.status === 409) {
              this.dialog.open(ConfirmDialogComponent, {
                width: '460px',
                data: {
                  title: 'No se puede desactivar la marca',
                  message: `${msg}\n\nDebes desvincular o archivar los productos vinculados antes de poder desactivar esta marca del catálogo.`,
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
