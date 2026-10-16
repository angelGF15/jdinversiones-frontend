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
import { FormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductsService } from '../../../../../../core/services/products/products.service';
import {
  ProductListItem,
  ProductDetail,
  ProductStatus,
} from '../../../../../../core/models/product.models';

export interface ProductStatusDialogData {
  product: ProductListItem;
  statuses?: ProductStatus[];
}

export interface StatusOptionDisplay {
  code: string;
  name: string;
  icon: string;
  description: string;
  colorClass: string;
  badgeClass: string;
}

@Component({
  selector: 'app-product-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './product-status-dialog.component.html',
  styleUrls: ['./product-status-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStatusDialogComponent implements OnInit {
  public readonly dialogRef = inject(MatDialogRef<ProductStatusDialogComponent>);
  public readonly data: ProductStatusDialogData = inject(MAT_DIALOG_DATA);
  private readonly productsService = inject(ProductsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado ---
  public readonly selectedStatusCode = signal<string>(
    (this.data?.product?.statusCode || 'active').toLowerCase()
  );
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly catalogStatuses = signal<ProductStatus[]>(this.data?.statuses || []);

  /** Opciones de estado enriquecidas con metadatos de UI */
  public readonly statusOptions: StatusOptionDisplay[] = [
    {
      code: 'active',
      name: 'Activo',
      icon: 'check_circle',
      description: 'El producto se publicará y estará visible para todos los clientes en la tienda.',
      colorClass: 'emerald',
      badgeClass:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    },
    {
      code: 'draft',
      name: 'Borrador',
      icon: 'edit_note',
      description: 'Oculto al público mientras se editan fotos, precios o características técnicas.',
      colorClass: 'amber',
      badgeClass:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    },
    {
      code: 'inactive',
      name: 'Inactivo',
      icon: 'block',
      description: 'Deshabilitado del catálogo. No aparecerá en búsquedas ni listados comerciales.',
      colorClass: 'slate',
      badgeClass:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
  ];

  /** Indica si el usuario seleccionó un estado diferente al actual */
  public readonly hasChanged = computed(() => {
    const current = (this.data?.product?.statusCode || '').toLowerCase();
    return this.selectedStatusCode() !== current;
  });

  /** Identifica la opción actualmente seleccionada */
  public readonly currentOption = computed(() => {
    return (
      this.statusOptions.find((opt) => opt.code === this.selectedStatusCode()) ||
      this.statusOptions[0]
    );
  });

  ngOnInit(): void {
    if (this.catalogStatuses().length === 0) {
      this.productsService
        .listStatuses()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (statuses) => this.catalogStatuses.set(statuses),
          error: () => {},
        });
    }
  }

  public selectStatus(statusCode: string): void {
    if (this.isSubmitting()) return;
    this.selectedStatusCode.set(statusCode.toLowerCase());
    this.errorMessage.set(null);
  }

  public onSubmit(): void {
    if (!this.hasChanged() || this.isSubmitting()) return;

    const prod = this.data.product;
    const targetStatus = this.selectedStatusCode();

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.productsService
      .setStatus(prod.id, targetStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProduct: ProductDetail) => {
          this.isSubmitting.set(false);
          const optionName = this.currentOption().name;

          this.snackBar.open(
            `Estado de "${prod.name}" cambiado a ${optionName} exitosamente`,
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );

          this.dialogRef.close(updatedProduct);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          const msg = Array.isArray(err?.error?.message)
            ? err.error.message.join(' · ')
            : err?.error?.message ?? 'Ocurrió un error al actualizar el estado del producto.';
          this.errorMessage.set(msg);
        },
      });
  }

  public onCancel(): void {
    this.dialogRef.close(null);
  }
}
