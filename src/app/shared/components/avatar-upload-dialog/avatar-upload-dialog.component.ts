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

import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';
import { UsersService } from '../../../core/services/users.service';

export interface AvatarUploadDialogData {
  avatarUrl?: string | null;
  userId?: string | null; // Si es null/undefined, opera sobre la sesión del usuario actual ('me')
  userName?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

@Component({
  selector: 'app-avatar-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './avatar-upload-dialog.component.html',
  styleUrls: ['./avatar-upload-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarUploadDialogComponent implements OnDestroy {
  public readonly dialogRef = inject(MatDialogRef<AvatarUploadDialogComponent>);
  public readonly data: AvatarUploadDialogData = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly usersService = inject(UsersService);

  // --- Signals de Estado Primario ---
  public readonly currentAvatarUrl = signal<string | null>(this.data?.avatarUrl ?? null);
  public readonly previewUrl = signal<string | null>(null);
  public readonly selectedFile = signal<File | null>(null);
  public readonly imageDimensions = signal<ImageDimensions | null>(null);
  public readonly isDragging = signal<boolean>(false);
  public readonly isUploading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  // --- Signals Computados (UI/UX Pro Max) ---
  public readonly hasNewSelection = computed(() => !!this.selectedFile() && !!this.previewUrl());

  public readonly targetUserName = computed(() => {
    return this.data?.userName || this.authState.fullName() || 'Usuario del Sistema';
  });

  public readonly userInitials = computed(() => {
    const name = this.targetUserName().trim();
    if (!name) return 'JD';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  public readonly isSelfMode = computed(() => !this.data?.userId);

  private objectUrlToRevoke: string | null = null;

  ngOnDestroy(): void {
    this.cleanUpObjectUrl();
  }

  /**
   * Manejador de selección de archivo mediante el file picker nativo.
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.processFile(input.files[0]);
    input.value = '';
  }

  /**
   * Manejadores de eventos Drag & Drop accesibles.
   */
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

  /**
   * Valida tipo, tamaño y decodificabilidad de la imagen para asegurar integridad total.
   */
  private processFile(file: File): void {
    this.errorMessage.set(null);

    // 1. Validación de tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.errorMessage.set('Formato de imagen no permitido. Solo se aceptan archivos PNG, JPG o WebP.');
      return;
    }

    // 2. Validación de tamaño (2 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set('La imagen supera el límite de 2 MB. Elige una imagen más liviana.');
      return;
    }

    this.cleanUpObjectUrl();

    // 3. Crear ObjectURL y validar que sea una imagen decodificable
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const tempUrl = URL.createObjectURL(file);
      this.objectUrlToRevoke = tempUrl;

      // Verificación en memoria de decodificación real
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
          this.errorMessage.set('El archivo seleccionado está dañado o no es una imagen gráfica válida.');
        };
        testImg.src = tempUrl;
      } else {
        this.previewUrl.set(tempUrl);
        this.selectedFile.set(file);
      }
    }
  }

  /**
   * Desecha el archivo seleccionado y restaura la vista previa del avatar actual.
   */
  public onClearSelection(): void {
    if (this.isUploading()) return;
    this.cleanUpObjectUrl();
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    this.imageDimensions.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Sube la imagen vía proxy al backend (POST /users/me/avatar o POST /users/:id/avatar).
   */
  public onSave(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    const isSelf = this.isSelfMode();

    const upload$ = isSelf
      ? this.authService.uploadMyAvatar(file)
      : this.usersService.uploadAvatar(this.data.userId!, file);

    upload$.subscribe({
      next: (updatedUser) => {
        this.isUploading.set(false);

        // Actualización instantánea de sesión en memoria y localStorage si aplica
        const currentProfile = this.authState.profile();
        if (isSelf && currentProfile) {
          this.authState.setProfile({
            ...currentProfile,
            avatarUrl: updatedUser.avatarUrl,
          });
        } else if (currentProfile && currentProfile.userId === this.data?.userId) {
          this.authState.setProfile({
            ...currentProfile,
            avatarUrl: updatedUser.avatarUrl,
          });
        }

        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        this.handleUploadError(err);
      },
    });
  }

  public onCancel(): void {
    if (!this.isUploading()) {
      this.dialogRef.close(false);
    }
  }

  /**
   * Formatea el tamaño del archivo en KB o MB.
   */
  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private handleUploadError(err: HttpErrorResponse): void {
    if (err.status === 400) {
      this.errorMessage.set('El archivo enviado no es válido. Debe ser PNG, JPG o WebP.');
    } else if (err.status === 413) {
      this.errorMessage.set('La imagen supera el tamaño máximo permitido por el servidor (2 MB).');
    } else if (err.status === 502) {
      this.errorMessage.set('El servicio de almacenamiento en la nube (Cloudinary) no está disponible temporalmente.');
    } else if (err.error?.message) {
      const msg = Array.isArray(err.error.message) ? err.error.message[0] : err.error.message;
      this.errorMessage.set(msg);
    } else {
      this.errorMessage.set('Ocurrió un error inesperado al subir la imagen. Por favor, intente nuevamente.');
    }
  }

  private cleanUpObjectUrl(): void {
    if (this.objectUrlToRevoke && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }
}
