import {
  Component,
  inject,
  signal,
  computed,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CategoriesService } from '../../../../../../core/services/categories.service';
import { Category, CategoryChild } from '../../../../../../core/models/category.models';

export interface CategoryImageDialogData {
  category: CategoryChild;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB según contrato del backend

@Component({
  selector: 'app-category-image-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './category-image-dialog.component.html',
  styleUrls: ['./category-image-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryImageDialogComponent implements OnDestroy {
  public readonly dialogRef = inject(MatDialogRef<CategoryImageDialogComponent>);
  public readonly data: CategoryImageDialogData = inject(MAT_DIALOG_DATA);
  private readonly categoriesService = inject(CategoriesService);
  private readonly snackBar = inject(MatSnackBar);

  // --- Signals de Estado ---
  public readonly currentImageUrl = signal<string | null>(this.data?.category?.imageUrl ?? null);
  public readonly previewUrl = signal<string | null>(null);
  public readonly selectedFile = signal<File | null>(null);
  public readonly imageDimensions = signal<ImageDimensions | null>(null);
  public readonly isDragging = signal<boolean>(false);
  public readonly isUploading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  // --- Computados ---
  public readonly hasNewSelection = computed(() => !!this.selectedFile() && !!this.previewUrl());

  private objectUrlToRevoke: string | null = null;

  public ngOnDestroy(): void {
    this.cleanUpObjectUrl();
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.processFile(input.files[0]);
    input.value = '';
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isUploading() && !this.isDragging()) {
      this.isDragging.set(true);
    }
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (this.isUploading()) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  public processFile(file: File): void {
    this.errorMessage.set(null);

    // Validación de tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.errorMessage.set(
        'Formato no permitido. Solo se aceptan imágenes en formato PNG, JPEG o WebP.'
      );
      return;
    }

    // Validación de tamaño máximo (5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set(
        `El archivo supera el tamaño máximo permitido de 5 MB (${this.formatFileSize(file.size)}).`
      );
      return;
    }

    this.cleanUpObjectUrl();

    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const tempUrl = URL.createObjectURL(file);
      this.objectUrlToRevoke = tempUrl;
      this.previewUrl.set(tempUrl);
      this.selectedFile.set(file);

      if (typeof Image !== 'undefined') {
        const testImg = new Image();
        testImg.onload = () => {
          this.imageDimensions.set({
            width: testImg.naturalWidth,
            height: testImg.naturalHeight,
          });
        };
        testImg.src = tempUrl;
      }
    } else {
      this.selectedFile.set(file);
    }
  }

  public onClearSelection(): void {
    if (this.isUploading()) return;
    this.cleanUpObjectUrl();
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    this.imageDimensions.set(null);
    this.errorMessage.set(null);
  }

  public onSave(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    this.categoriesService.uploadImage(this.data.category.id, file).subscribe({
      next: (updatedCategory: Category) => {
        this.isUploading.set(false);
        this.snackBar.open(
          `Imagen de la categoría "${updatedCategory.name}" actualizada exitosamente.`,
          'Cerrar',
          {
            duration: 3500,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
        this.dialogRef.close(updatedCategory);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        const msg = Array.isArray(err.error?.message)
          ? err.error.message.join(' · ')
          : err.error?.message ?? 'Ocurrió un error al subir la imagen a Cloudinary.';
        this.errorMessage.set(msg);
      },
    });
  }

  public onCancel(): void {
    if (this.isUploading()) return;
    this.dialogRef.close(null);
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private cleanUpObjectUrl(): void {
    if (this.objectUrlToRevoke && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }
}
