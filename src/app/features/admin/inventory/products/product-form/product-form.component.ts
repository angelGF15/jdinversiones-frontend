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
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductsService } from '../../../../../core/services/products/products.service';
import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductDetail,
  ProductStatus,
  ProductImage,
  ProductAttributeInput,
} from '../../../../../core/models/product.models';
import { CategoryChild } from '../../../../../core/models/category.models';
import { CatalogBrand } from '../../../../../core/models/brand.models';
import { ProductGalleryComponent } from '../components/product-gallery/product-gallery.component';
import { ProductAttributesEditorComponent } from '../components/product-attributes-editor/product-attributes-editor.component';

/**
 * Convierte una cadena de texto en un slug URL-friendly normalizado.
 */
export function slugifyProduct(text: string): string {
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
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTooltipModule,
    ProductGalleryComponent,
    ProductAttributesEditorComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly brandsService = inject(BrandsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado ---
  public readonly isEditMode = signal<boolean>(false);
  public readonly productId = signal<string | null>(null);
  public readonly product = signal<ProductDetail | null>(null);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly isCustomSlug = signal<boolean>(false);
  public readonly isImageBroken = signal<boolean>(false);
  public readonly currentAttributes = signal<ProductAttributeInput[] | null>(null);
  public readonly queuedImages = signal<File[]>([]);

  // --- Catálogos Maestros Activos ---
  public readonly availableCategories = signal<CategoryChild[]>([]);
  public readonly availableBrands = signal<CatalogBrand[]>([]);
  public readonly availableStatuses = signal<ProductStatus[]>([]);

  private initialStatusCode = 'active';

  public onAttributesChange(attrs: ProductAttributeInput[]): void {
    this.currentAttributes.set(attrs);
  }

  public onGalleryImagesChange(images: ProductImage[]): void {
    this.product.update((p) => (p ? { ...p, images } : p));
  }

  public onProductUpdated(updated: ProductDetail): void {
    this.product.set(updated);
  }

  public onLocalQueueChange(files: File[]): void {
    this.queuedImages.set(files);
  }

  // --- Formulario Reactivo con Validadores Espejo del Backend ---
  public readonly form = this.fb.group({
    sku: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9-]+$/),
      ],
    ],
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(200)],
    ],
    slug: [
      '',
      [
        Validators.maxLength(220),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    ],
    categoryId: ['', [Validators.required]],
    brandId: ['', [Validators.required]],
    statusCode: ['active', [Validators.required]],
    isFeatured: [false],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    costPrice: [null as number | null, [Validators.min(0)]],
    shortDescription: ['', [Validators.maxLength(500)]],
    description: ['', [Validators.maxLength(5000)]],
    metaTitle: ['', [Validators.maxLength(100)]],
    metaDescription: ['', [Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    // 1. Cargar catálogos activos (categorías, marcas y estados)
    this.loadCatalogs();

    // 2. Determinar modo edición o creación según parámetro :id
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.productId.set(idParam);
      this.isCustomSlug.set(true);
      this.loadProductDetail(idParam);
    } else {
      // Autogenerar slug en tiempo real mientras se escribe el nombre
      this.form.controls.name.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((name) => {
          if (!this.isCustomSlug()) {
            this.form.controls.slug.setValue(slugifyProduct(name || ''), {
              emitEvent: false,
            });
          }
        });
    }
  }

  private loadCatalogs(): void {
    this.categoriesService
      .listParents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.availableCategories.set(categories.filter((c) => c.isActive));
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las categorías del catálogo.');
        },
      });

    this.brandsService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brands) => {
          this.availableBrands.set(brands.filter((b) => b.isActive));
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las marcas comerciales.');
        },
      });

    this.productsService
      .listStatuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (statuses) => {
          this.availableStatuses.set(statuses);
        },
        error: () => {},
      });
  }

  public loadProductDetail(id: string): void {
    this.isLoading.set(true);
    this.isImageBroken.set(false);
    this.errorMessage.set(null);

    this.productsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product: ProductDetail) => {
          this.isLoading.set(false);
          this.product.set(product);
          this.initialStatusCode = product.statusCode || 'active';

          this.form.patchValue({
            sku: product.sku,
            name: product.name,
            slug: product.slug,
            categoryId: product.categoryId,
            brandId: product.brandId ?? '',
            statusCode: product.statusCode || 'active',
            isFeatured: !!product.isFeatured,
            price: product.price,
            costPrice: product.costPrice ?? null,
            shortDescription: product.shortDescription ?? '',
            description: product.description ?? '',
            metaTitle: product.metaTitle ?? '',
            metaDescription: product.metaDescription ?? '',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg =
            err.status === 404
              ? 'El producto solicitado no existe o fue eliminado del catálogo.'
              : 'Ocurrió un error al cargar la ficha técnica del producto.';
          this.errorMessage.set(msg);
        },
      });
  }

  /**
   * Determina si el formulario tiene cambios sin guardar.
   */
  public isDirty(): boolean {
    return this.form.dirty;
  }

  /**
   * Descarta los cambios pendientes y restablece el formulario a su estado original.
   */
  public discard(): void {
    if (this.isEditMode() && this.product()) {
      const p = this.product()!;
      this.form.reset({
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        categoryId: p.categoryId,
        brandId: p.brandId ?? '',
        statusCode: p.statusCode || 'active',
        isFeatured: !!p.isFeatured,
        price: p.price,
        costPrice: p.costPrice ?? null,
        shortDescription: p.shortDescription ?? '',
        description: p.description ?? '',
        metaTitle: p.metaTitle ?? '',
        metaDescription: p.metaDescription ?? '',
      });
      this.currentAttributes.set(p.attributes ?? []);
    } else {
      this.form.reset({
        sku: '',
        name: '',
        slug: '',
        categoryId: '',
        brandId: '',
        statusCode: 'active',
        isFeatured: false,
        price: null,
        costPrice: null,
        shortDescription: '',
        description: '',
        metaTitle: '',
        metaDescription: '',
      });
      this.currentAttributes.set([]);
    }
  }

  /**
   * Alterna entre el modo de slug autogenerado o personalizado manualmente.
   */
  public toggleCustomSlug(): void {
    const nextState = !this.isCustomSlug();
    this.isCustomSlug.set(nextState);

    if (!nextState) {
      const name = this.form.controls.name.value || '';
      this.form.controls.slug.setValue(slugifyProduct(name));
      this.form.controls.slug.markAsDirty();
    }
  }

  /**
   * Normaliza el SKU en mayúsculas cuando el usuario lo solicita o escribe.
   */
  public normalizeSkuUppercase(): void {
    const current = this.form.controls.sku.value;
    if (current) {
      this.form.controls.sku.setValue(current.trim().toUpperCase());
    }
  }

  /**
   * Alterna el estado booleano de Producto Destacado (isFeatured).
   */
  public toggleFeatured(): void {
    const next = !this.form.controls.isFeatured.value;
    this.form.controls.isFeatured.setValue(next);
    this.form.controls.isFeatured.markAsDirty();
    this.form.controls.isFeatured.markAsTouched();
  }

  public onKeyDownFeatured(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggleFeatured();
    }
  }

  /**
   * Calcula reactivamente el porcentaje de margen bruto: ((PVP - Costo) / PVP) * 100
   */
  public get grossMarginPercent(): number | null {
    const rawPrice = this.form.controls.price.value;
    const rawCost = this.form.controls.costPrice.value;

    if (
      rawPrice === null ||
      rawPrice === undefined ||
      Number(rawPrice) <= 0 ||
      rawCost === null ||
      rawCost === undefined ||
      String(rawCost) === '' ||
      Number(rawCost) < 0
    ) {
      return null;
    }

    const pvp = Number(rawPrice);
    const cost = Number(rawCost);
    return ((pvp - cost) / pvp) * 100;
  }

  /**
   * Calcula la utilidad bruta unitaria en Lempiras (PVP - Costo).
   */
  public get unitProfit(): number | null {
    const rawPrice = this.form.controls.price.value;
    const rawCost = this.form.controls.costPrice.value;

    if (
      rawPrice === null ||
      rawPrice === undefined ||
      Number(rawPrice) < 0 ||
      rawCost === null ||
      rawCost === undefined ||
      String(rawCost) === '' ||
      Number(rawCost) < 0
    ) {
      return null;
    }

    return Number(rawPrice) - Number(rawCost);
  }

  /**
   * Clasificación semántica de la salud del margen bruto para feedback visual.
   */
  public get marginHealth(): 'high' | 'medium' | 'low' | 'negative' | 'neutral' {
    const margin = this.grossMarginPercent;
    if (margin === null) return 'neutral';
    if (margin < 0) return 'negative';
    if (margin < 15) return 'low';
    if (margin < 30) return 'medium';
    return 'high';
  }

  /**
   * Ancho porcentual acotado [0..100] para la barra de telemetría de margen.
   */
  public get marginBarWidth(): number {
    const margin = this.grossMarginPercent;
    if (margin === null || margin <= 0) return 0;
    return Math.min(100, Math.max(4, Math.round(margin)));
  }

  // --- Getters para Previsualización SERP (Google Search) ---
  public get serpTitle(): string {
    const meta = this.form.controls.metaTitle.value?.trim();
    const name = this.form.controls.name.value?.trim();
    return meta || (name ? `${name} | JD Inversiones` : 'Título del Producto | JD Inversiones');
  }

  public get serpSlug(): string {
    const slug = this.form.controls.slug.value?.trim();
    const name = this.form.controls.name.value?.trim();
    return slug || (name ? slugifyProduct(name) : 'slug-del-producto');
  }

  public get serpDescription(): string {
    const meta = this.form.controls.metaDescription.value?.trim();
    const shortDesc = this.form.controls.shortDescription.value?.trim();
    return (
      meta ||
      shortDesc ||
      'Escribe una meta descripción o resumen corto para visualizar cómo se presentará este producto en los motores de búsqueda como Google.'
    );
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
    const raw = this.form.getRawValue();
    const hasCost =
      raw.costPrice !== null &&
      raw.costPrice !== undefined &&
      String(raw.costPrice).trim() !== '';

    const payload: CreateProductRequest = {
      sku: raw.sku!.trim(),
      name: raw.name!.trim(),
      slug: raw.slug?.trim() ? raw.slug.trim() : undefined,
      categoryId: raw.categoryId!,
      brandId: raw.brandId!,
      statusCode: raw.statusCode || 'active',
      isFeatured: !!raw.isFeatured,
      price: Number(raw.price),
      costPrice: hasCost ? Number(raw.costPrice) : null,
      shortDescription: raw.shortDescription?.trim() ? raw.shortDescription.trim() : undefined,
      description: raw.description?.trim() ? raw.description.trim() : undefined,
      metaTitle: raw.metaTitle?.trim() ? raw.metaTitle.trim() : undefined,
      metaDescription: raw.metaDescription?.trim() ? raw.metaDescription.trim() : undefined,
      attributes: this.currentAttributes() ? this.currentAttributes()! : undefined,
    };

    this.isSubmitting.set(true);

    this.productsService
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.snackBar.open(
            `Producto "${created.name}" creado exitosamente.`,
            'Cerrar',
            {
              duration: 3500,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
          this.router.navigate(['/admin/inventory/products']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al crear el producto.');
        },
      });
  }

  private handleEditSubmit(): void {
    const id = this.productId();
    if (!id) return;

    const raw = this.form.getRawValue();
    const hasCost =
      raw.costPrice !== null &&
      raw.costPrice !== undefined &&
      String(raw.costPrice).trim() !== '';

    // Importante: Se omiten `images` y `attributes` (undefined) para preservar intactos
    // los registros existentes en base de datos durante la actualización de datos base
    // a menos que hayan sido modificados explícitamente en el editor de atributos.
    const payload: UpdateProductRequest = {
      sku: raw.sku!.trim(),
      name: raw.name!.trim(),
      slug: raw.slug?.trim() ? raw.slug.trim() : undefined,
      categoryId: raw.categoryId!,
      brandId: raw.brandId!,
      isFeatured: !!raw.isFeatured,
      price: Number(raw.price),
      costPrice: hasCost ? Number(raw.costPrice) : null,
      shortDescription: raw.shortDescription?.trim() ?? '',
      description: raw.description?.trim() ?? '',
      metaTitle: raw.metaTitle?.trim() ?? '',
      metaDescription: raw.metaDescription?.trim() ?? '',
    };

    if (this.currentAttributes() !== null) {
      payload.attributes = this.currentAttributes()!;
    }

    const nextStatusCode = raw.statusCode || this.initialStatusCode;
    const statusChanged = nextStatusCode !== this.initialStatusCode;

    this.isSubmitting.set(true);

    this.productsService
      .update(id, payload)
      .pipe(
        switchMap((updated) =>
          statusChanged ? this.productsService.setStatus(id, nextStatusCode) : of(updated)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.product.set(updated);
          this.snackBar.open('Producto actualizado exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.router.navigate(['/admin/inventory/products']);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.handleHttpError(err, 'Ocurrió un error al actualizar el producto.');
        },
      });
  }

  private handleHttpError(err: HttpErrorResponse, defaultMsg: string): void {
    const msg = Array.isArray(err.error?.message)
      ? err.error.message.join(' · ')
      : err.error?.message ?? defaultMsg;

    if (err.status === 409) {
      const lower = msg.toLowerCase();
      if (lower.includes('sku')) {
        this.form.controls.sku.setErrors({ serverConflict: msg });
        this.form.controls.sku.markAsTouched();
      } else if (lower.includes('slug')) {
        this.form.controls.slug.setErrors({ serverConflict: msg });
        this.form.controls.slug.markAsTouched();
      }
    }

    this.errorMessage.set(msg);
  }

  public getStatusLabel(code?: string | null): string {
    const normalized = (code || '').toLowerCase();
    if (normalized === 'active') return 'Activo';
    if (normalized === 'draft') return 'Borrador';
    if (normalized === 'inactive') return 'Inactivo';
    const found = this.availableStatuses().find((s) => s.code === code);
    return found ? found.name : code || 'Activo';
  }

  public getSelectedCategoryName(): string {
    const id = this.form.controls.categoryId.value;
    if (!id) return this.product()?.categoryName || 'Sin asignar';
    const found = this.availableCategories().find((c) => c.id === id);
    return found ? found.name : this.product()?.categoryName || 'Categoría seleccionada';
  }

  public getSelectedBrandName(): string {
    const id = this.form.controls.brandId.value;
    if (!id) return this.product()?.brandName || 'Sin asignar';
    const found = this.availableBrands().find((b) => b.id === id);
    return found ? found.name : this.product()?.brandName || 'Marca seleccionada';
  }

  public onMainImageError(): void {
    this.isImageBroken.set(true);
  }

  public get formattedCreatedAt(): string {
    const d = this.product()?.createdAt;
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

  public copyProductId(): void {
    const id = this.productId();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      this.snackBar.open('ID copiado al portapapeles', 'Cerrar', {
        duration: 2500,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      });
    });
  }
}
