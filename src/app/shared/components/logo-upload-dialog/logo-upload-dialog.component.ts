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

import { ConfigService } from '../../../core/services/config.service';
import { BrandService } from '../../../core/services/brand.service';

export interface LogoUploadDialogData {
  currentLogoUrl?: string | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB según contrato backend

@Component({
  selector: 'app-logo-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './logo-upload-dialog.component.html',
  styleUrls: ['./logo-upload-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoUploadDialogComponent implements OnDestroy {
  public readonly dialogRef = inject(MatDialogRef<LogoUploadDialogComponent>);
  public readonly data: LogoUploadDialogData = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly configService = inject(ConfigService);
  private readonly brandService = inject(BrandService);
  private readonly snackBar = inject(MatSnackBar);

  // --- Signals de Estado ---
  public readonly currentLogoUrl = signal<string | null>(this.data?.currentLogoUrl ?? null);
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

  private processFile(file: File): void {
    this.errorMessage.set(null);

    // Validación de tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.errorMessage.set('Formato no permitido. Solo se aceptan imágenes PNG, JPG o WebP.');
      return;
    }

    // Validación de tamaño máximo (2 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set('El logo supera el tamaño máximo permitido (2 MB).');
      return;
    }

    this.cleanUpObjectUrl();

    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const tempUrl = URL.createObjectURL(file);
      this.objectUrlToRevoke = tempUrl;

      if (typeof Image !== 'undefined') {
        const testImg = new Image();
        testImg.onload = () => {
          this.imageDimensions.set({
            width: testImg.naturalWidth,
            height: testImg.naturalHeight,
          });
          this.previewUrl.set(tempUrl);
          this.selectedFile.set(file);
        };
        testImg.onerror = () => {
          this.cleanUpObjectUrl();
          this.errorMessage.set('El archivo seleccionado está dañado o no es una imagen válida.');
        };
        testImg.src = tempUrl;
      } else {
        this.previewUrl.set(tempUrl);
        this.selectedFile.set(file);
      }
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

    this.configService.uploadLogo(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.brandService.patchBrandLocally({ logoUrl: res.logoUrl });
        this.brandService.refresh().subscribe();
        this.snackBar.open('Logotipo institucional actualizado exitosamente.', 'Cerrar', {
          duration: 3500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
        this.dialogRef.close({ logoUrl: res.logoUrl });
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        this.handleUploadError(err);
      },
    });
  }

  public onCancel(): void {
    if (!this.isUploading()) {
      this.dialogRef.close(null);
    }
  }

  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private handleUploadError(err: HttpErrorResponse): void {
    if (err.status === 400) {
      this.errorMessage.set('El archivo enviado no es válido. Debe ser PNG, JPG o WebP.');
    } else if (err.status === 413) {
      this.errorMessage.set('El logo supera el tamaño máximo permitido por el servidor (2 MB).');
    } else if (err.status === 502) {
      this.errorMessage.set('El servicio de imágenes no está disponible temporalmente.');
    } else if (err.error?.message) {
      const msg = Array.isArray(err.error.message) ? err.error.message[0] : err.error.message;
      this.errorMessage.set(msg);
    } else {
      this.errorMessage.set('No se pudo subir el logotipo. Intente nuevamente.');
    }
  }

  private cleanUpObjectUrl(): void {
    if (this.objectUrlToRevoke && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }
}
