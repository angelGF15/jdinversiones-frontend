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
import { of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';
import { AttributesService } from '../../../../../core/services/attributes/attributes.service';
import {
  CatalogAttribute,
  AttributeListQuery,
} from '../../../../../core/models/attribute.models';
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
import { AttributeFormDialogComponent } from '../dialogs';

@Component({
  selector: 'app-attributes-list',
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
  templateUrl: './attributes-list.component.html',
  styleUrls: ['./attributes-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributesListComponent implements OnInit {
  private readonly attributesService = inject(AttributesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Gestor reactivo de estado de listado sincronizado con la URL. */
  public readonly queryState = new ListQueryState<AttributeListQuery>(this.route, this.router, {
    defaultPage: 1,
    defaultPageSize: 50,
  });

  // --- Signals Reactivos de Datos ---
  public readonly items = signal<CatalogAttribute[]>([]);
  public readonly total = signal<number>(0);
  public readonly totalPages = signal<number>(1);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly searchQuery = signal<string>('');

  // --- Opciones de Filtros ---
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activos' },
  ];

  /** Definición de columnas para app-data-table según especificación de Fase 3. */
  public readonly columns: DataTableColumn<CatalogAttribute>[] = [
    { key: 'displayOrder', header: 'Orden', width: '90px', align: 'center' },
    { key: 'name', header: 'Atributo', width: '220px' },
    { key: 'description', header: 'Descripción' },
    { key: 'createdAt', header: 'Fecha de Creación', type: 'date', width: '180px' },
    { key: 'isActive', header: 'Estado', width: '120px', align: 'center' },
    { header: 'Acciones', width: '120px', align: 'right', stickyEnd: true },
  ];

  /** Filtrado reactivo local del lado del cliente por coincidencia en nombre o descripción. */
  public readonly filteredItems = computed<CatalogAttribute[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const current = this.items();
    if (!query) {
      return current;
    }
    return current.filter(
      (attr) =>
        attr.name.toLowerCase().includes(query) ||
        (attr.description && attr.description.toLowerCase().includes(query))
    );
  });

  /** Total adaptado al filtro local actual para mostrar en el paginador. */
  public readonly filteredTotal = computed<number>(() => {
    if (this.searchQuery().trim()) {
      return this.filteredItems().length;
    }
    return this.total();
  });

  /** Total de páginas calculado para el conjunto filtrado. */
  public readonly calculatedTotalPages = computed<number>(() => {
    if (this.searchQuery().trim()) {
      const size = this.queryState.pageSize() || 50;
      return Math.max(1, Math.ceil(this.filteredItems().length / size));
    }
    return this.totalPages();
  });

  ngOnInit(): void {
    // Hidratar búsqueda inicial si venía en queryParams
    const initialFilters = this.queryState.filters();
    if (typeof initialFilters['search'] === 'string') {
      this.searchQuery.set(initialFilters['search'] as string);
    }

    // Conectar cambios de queryState hacia el servicio con switchMap anti-carreras
    toObservable(this.queryState.state, { injector: this.injector })
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((query: AttributeListQuery) => {
          const apiQuery: AttributeListQuery = {
            page: query.page,
            limit: query.limit,
            isActive:
              query.isActive !== undefined && query.isActive !== null
                ? Boolean(query.isActive)
                : undefined,
          };

          return this.attributesService.list(apiQuery).pipe(
            catchError((err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al cargar el listado de atributos.';
              this.errorMessage.set(msg);
              return of(null);
            })
          );
        }),
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
    const searchVal = typeof filters['search'] === 'string' ? filters['search'] : '';
    this.searchQuery.set(searchVal);
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

  /**
   * Abre el formulario modal para registrar un nuevo atributo.
   * Inserta reactivamente el nuevo registro en la lista local si se crea con éxito.
   */
  public onNewAttribute(): void {
    const dialogRef = this.dialog.open(AttributeFormDialogComponent, {
      width: '520px',
      data: { mode: 'create' },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((created: CatalogAttribute | null) => {
      if (!created) return;
      this.items.update((list) => [created, ...list]);
      this.total.update((t) => t + 1);
    });
  }

  /**
   * Abre el formulario modal para editar el atributo seleccionado.
   * Actualiza reactivamente el registro en la lista local si se guarda con éxito.
   */
  public onEditAttribute(attribute: CatalogAttribute): void {
    const dialogRef = this.dialog.open(AttributeFormDialogComponent, {
      width: '520px',
      data: { mode: 'edit', attribute },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((updated: CatalogAttribute | null) => {
      if (!updated) return;
      this.items.update((list) =>
        list.map((item) => (item.id === updated.id ? updated : item))
      );
    });
  }

  /**
   * Solicita confirmación y alterna el estado activo/inactivo del atributo.
   * Si se intenta desactivar un atributo en uso por productos existentes (409 Conflict),
   * despliega un modal informativo de advertencia con el mensaje del servidor sin alterar la UI.
   */
  public onToggleStatus(attribute: CatalogAttribute): void {
    const willBeActive = !attribute.isActive;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: willBeActive ? 'Activar atributo' : 'Desactivar atributo',
        message: willBeActive
          ? `¿Deseas activar el atributo "${attribute.name}"? Estará disponible inmediatamente para asignar a productos.`
          : `¿Deseas desactivar el atributo "${attribute.name}"? Los productos que ya lo tengan asignado no se verán afectados, pero no se podrá asignar a nuevos productos.`,
        confirmText: willBeActive ? 'Activar' : 'Desactivar',
        isDestructive: !willBeActive,
        icon: willBeActive ? 'check_circle' : 'block',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.attributesService.setStatus(attribute.id, willBeActive).subscribe({
        next: (updated: CatalogAttribute) => {
          this.items.update((list) =>
            list.map((item) =>
              item.id === attribute.id ? { ...item, isActive: updated.isActive } : item
            )
          );
          this.snackBar.open(
            updated.isActive
              ? `Atributo "${attribute.name}" activado exitosamente`
              : `Atributo "${attribute.name}" desactivado exitosamente`,
            'Cerrar',
            { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' }
          );
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al cambiar el estado del atributo.';

          if (err.status === 409) {
            this.dialog.open(ConfirmDialogComponent, {
              width: '460px',
              data: {
                title: 'No se puede desactivar el atributo',
                message: errorMsg,
                confirmText: 'Entendido',
                cancelText: 'Cerrar',
                isDestructive: false,
                icon: 'warning',
              },
            });
          } else {
            this.snackBar.open(errorMsg, 'Cerrar', {
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
