import {
  Component,
  inject,
  signal,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';
import { UsersService } from '../../../core/services/users.service';

export interface AvatarUploadDialogData {
  avatarUrl?: string | null;
  userId?: string | null; // Si es null/undefined, opera sobre el usuario logueado ('me')
  userName?: string;
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

  // --- Signals de Estado ---
  public readonly currentAvatarUrl = signal<string | null>(this.data?.avatarUrl ?? null);
  public readonly previewUrl = signal<string | null>(null);
  public readonly selectedFile = signal<File | null>(null);
  public readonly isDragging = signal<boolean>(false);
  public readonly isUploading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

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
    // Limpia el value para permitir volver a seleccionar el mismo archivo si se desea
    input.value = '';
  }

  /**
   * Manejadores de eventos Drag & Drop.
   */
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isUploading()) {
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
   * Valida tipo y tamaño del archivo y genera la URL de vista previa local.
   */
  private processFile(file: File): void {
    this.errorMessage.set(null);

    // Validación de tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.errorMessage.set('El archivo debe ser una imagen válida (PNG, JPG o WebP).');
      return;
    }

    // Validación de tamaño (2 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set('La imagen supera el tamaño máximo permitido (2 MB).');
      return;
    }

    this.cleanUpObjectUrl();

    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      this.objectUrlToRevoke = URL.createObjectURL(file);
      this.previewUrl.set(this.objectUrlToRevoke);
    }

    this.selectedFile.set(file);
  }

  /**
   * Desecha el archivo seleccionado y restaura la vista previa del avatar actual.
   */
  public onClearSelection(): void {
    if (this.isUploading()) return;
    this.cleanUpObjectUrl();
    this.previewUrl.set(null);
    this.selectedFile.set(null);
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

    const isSelfMode = !this.data?.userId;

    const upload$ = isSelfMode
      ? this.authService.uploadMyAvatar(file)
      : this.usersService.uploadAvatar(this.data.userId!, file);

    upload$.subscribe({
      next: (updatedUser) => {
        this.isUploading.set(false);

        // Si se actualizó el avatar del usuario en sesión, actualizamos el AuthState
        const currentProfile = this.authState.profile();
        if (isSelfMode && currentProfile) {
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
   * Formatea el tamaño del archivo en KB o MB para feedback visual.
   */
  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private handleUploadError(err: HttpErrorResponse): void {
    if (err.status === 400) {
      this.errorMessage.set('El archivo debe ser una imagen válida (PNG, JPG o WebP).');
    } else if (err.status === 413) {
      this.errorMessage.set('La imagen supera el tamaño máximo permitido en el servidor (2 MB).');
    } else if (err.status === 502) {
      this.errorMessage.set('El servicio de almacenamiento de imágenes no está disponible. Por favor, intente más tarde.');
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
