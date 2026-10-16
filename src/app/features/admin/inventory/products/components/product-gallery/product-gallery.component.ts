import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductsService } from '../../../../../../core/services/products/products.service';
import {
  ProductImage,
  ProductImageInput,
  ProductDetail,
} from '../../../../../../core/models/product.models';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface LocalQueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
  altText: string;
  displayOrder: number;
}

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGalleryComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** ID del producto actual. Si es null, el componente opera en modo creación (cola local). */
  public readonly productId = input<string | null>(null);

  /** Lista inicial de imágenes del producto cargadas desde el backend. */
  public readonly initialImages = input<ProductImage[]>([], { alias: 'images' });

  /** Modo solo lectura (deshabilita subida, reordenamiento y eliminación). */
  public readonly readonly = input<boolean>(false);

  /** Emite el listado de imágenes actualizado al padre. */
  public readonly imagesChange = output<ProductImage[]>();

  /** Emite cuando el producto completo es actualizado por el backend (en modo edición). */
  public readonly productUpdated = output<ProductDetail>();

  /** Emite la cola de archivos locales en modo creación para subida posterior. */
  public readonly localQueueChange = output<File[]>();

  // --- Signals Locales de Estado ---
  public readonly galleryImages = signal<ProductImage[]>([]);
  public readonly localQueue = signal<LocalQueuedImage[]>([]);
  public readonly isUploading = signal<boolean>(false);
  public readonly uploadProgress = signal<number>(0);
  public readonly isDragOver = signal<boolean>(false);
  public readonly activePreviewImage = signal<string | null>(null);
  public readonly brokenImageIds = signal<Set<string>>(new Set<string>());

  /** Conteo total de imágenes disponibles (guardadas + en cola) */
  public readonly totalImagesCount = computed(
    () => this.galleryImages().length + this.localQueue().length
  );

  /** Imagen principal actual (guardada o en cola) */
  public readonly primaryImage = computed<ProductImage | LocalQueuedImage | null>(() => {
    const saved = this.galleryImages().find((img) => img.isPrimary);
    if (saved) return saved;
    const queued = this.localQueue().find((img) => img.isPrimary);
    if (queued) return queued;
    return this.galleryImages()[0] || this.localQueue()[0] || null;
  });

  ngOnInit(): void {
    // Sincronizar imágenes iniciales
    this.galleryImages.set(this.initialImages() || []);
  }

  // --- Manejo de Drag and Drop ---
  public onDragOver(event: DragEvent): void {
    if (this.readonly() || this.isUploading()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  public onDrop(event: DragEvent): void {
    if (this.readonly() || this.isUploading()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  public onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.handleFiles(Array.from(inputEl.files));
      inputEl.value = '';
    }
  }

  /**
   * Valida y procesa los archivos seleccionados.
   */
  private handleFiles(files: File[]): void {
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    const validFiles: File[] = [];

    for (const file of files) {
      if (!validExtensions.includes(file.type)) {
        this.snackBar.open(
          `"${file.name}" no es válido. Solo se admiten formatos WebP, PNG y JPG.`,
          'Cerrar',
          { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        continue;
      }

      if (file.size > maxSizeBytes) {
        this.snackBar.open(
          `"${file.name}" supera el límite máximo permitido de 10 MB.`,
          'Cerrar',
          { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const prodId = this.productId();
    if (prodId) {
      // Modo Edición: Subir directamente al backend secuencialmente
      this.uploadFilesSequentially(prodId, validFiles);
    } else {
      // Modo Creación: Encolar localmente con previsualización DataURL
      this.queueLocalFiles(validFiles);
    }
  }

  /**
   * Sube archivos en serie al backend para un producto existente.
   */
  private uploadFilesSequentially(prodId: string, files: File[]): void {
    this.isUploading.set(true);
    this.uploadProgress.set(10);

    let index = 0;
    const total = files.length;

    const uploadNext = () => {
      if (index >= total) {
        this.isUploading.set(false);
        this.uploadProgress.set(100);
        this.snackBar.open(
          total === 1
            ? 'Imagen subida a la galería exitosamente'
            : `${total} imágenes subidas a la galería`,
          'Cerrar',
          { duration: 3500, horizontalPosition: 'right', verticalPosition: 'top' }
        );
        return;
      }

      const file = files[index];
      const isPrimary = this.galleryImages().length === 0 && index === 0;
      const displayOrder = this.galleryImages().length + index + 1;

      this.productsService
        .uploadImage(prodId, file, isPrimary, undefined, displayOrder)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedProduct) => {
            index++;
            this.uploadProgress.set(Math.round((index / total) * 100));
            this.galleryImages.set(updatedProduct.images);
            this.imagesChange.emit(updatedProduct.images);
            this.productUpdated.emit(updatedProduct);
            uploadNext();
          },
          error: (err: HttpErrorResponse) => {
            this.isUploading.set(false);
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message ?? `Error al subir "${file.name}".`;
            this.snackBar.open(msg, 'Cerrar', {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            });
          },
        });
    };

    uploadNext();
  }

  /**
   * Encola archivos en memoria para el modo de nuevo producto.
   */
  private queueLocalFiles(files: File[]): void {
    const newQueued: LocalQueuedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      const isFirst = this.localQueue().length === 0 && i === 0;

      newQueued.push({
        id: `local-${Date.now()}-${i}`,
        file,
        previewUrl,
        isPrimary: isFirst,
        altText: file.name,
        displayOrder: this.localQueue().length + i + 1,
      });
    }

    this.localQueue.update((list) => [...list, ...newQueued]);
    this.localQueueChange.emit(this.localQueue().map((item) => item.file));

    this.snackBar.open(
      `${files.length} ${files.length === 1 ? 'imagen añadida' : 'imágenes añadidas'} a la cola de subida`,
      'Cerrar',
      { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' }
    );
  }

  /**
   * Marca una imagen guardada como la principal del producto.
   */
  public onSetPrimary(image: ProductImage): void {
    if (this.readonly() || image.isPrimary) return;

    const prodId = this.productId();
    if (!prodId) return;

    // Generar nuevo array con isPrimary actualizado
    const updatedImages: ProductImageInput[] = this.galleryImages().map((img) => ({
      imageUrl: img.imageUrl,
      altText: img.altText || undefined,
      displayOrder: img.displayOrder,
      isPrimary: img.id === image.id,
    }));

    this.productsService
      .update(prodId, { images: updatedImages })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.galleryImages.set(updated.images);
          this.imagesChange.emit(updated.images);
          this.productUpdated.emit(updated);
          this.snackBar.open('Imagen principal actualizada', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
        error: (err: HttpErrorResponse) => {
          const msg = Array.isArray(err.error?.message)
            ? err.error.message.join(' · ')
            : err.error?.message ?? 'No se pudo actualizar la imagen principal.';
          this.snackBar.open(msg, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
  }

  /**
   * Marca una imagen local en cola como principal.
   */
  public onSetPrimaryLocal(queuedId: string): void {
    this.localQueue.update((list) =>
      list.map((item) => ({
        ...item,
        isPrimary: item.id === queuedId,
      }))
    );
  }

  /**
   * Solicita confirmación modal y elimina la imagen del producto en Cloudinary y BD.
   */
  public onDeleteImage(image: ProductImage): void {
    if (this.readonly()) return;

    const prodId = this.productId();
    if (!prodId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: '¿Eliminar imagen de la galería?',
        message:
          'La imagen será retirada permanentemente del catálogo y de la nube. Si era la imagen principal, el sistema designará otra automáticamente.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDestructive: true,
        icon: 'delete',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.productsService
          .removeImage(prodId, image.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (updated) => {
              this.galleryImages.set(updated.images);
              this.imagesChange.emit(updated.images);
              this.productUpdated.emit(updated);
              this.snackBar.open('Imagen eliminada de la galería', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              });
            },
            error: (err: HttpErrorResponse) => {
              const msg = Array.isArray(err.error?.message)
                ? err.error.message.join(' · ')
                : err.error?.message ?? 'Ocurrió un error al eliminar la imagen.';
              this.snackBar.open(msg, 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              });
            },
          });
      });
  }

  /**
   * Quita una imagen de la cola local de subida.
   */
  public onDeleteLocalImage(queuedId: string): void {
    this.localQueue.update((list) => {
      const filtered = list.filter((item) => item.id !== queuedId);
      // Si eliminamos la principal y quedan más, marcar la primera como principal
      if (filtered.length > 0 && !filtered.some((item) => item.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
    this.localQueueChange.emit(this.localQueue().map((item) => item.file));
  }

  public openPreview(url: string): void {
    this.activePreviewImage.set(url);
  }

  public closePreview(): void {
    this.activePreviewImage.set(null);
  }

  public onImageError(id: string): void {
    this.brokenImageIds.update((set) => {
      const updated = new Set(set);
      updated.add(id);
      return updated;
    });
  }

  public isImageBroken(id: string): boolean {
    return this.brokenImageIds().has(id);
  }
}
