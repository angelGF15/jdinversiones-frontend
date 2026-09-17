import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CredentialsDialogData {
  email: string;
  temporaryPassword: string;
  emailSent: boolean;
}

@Component({
  selector: 'app-credentials-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './credentials-dialog.component.html',
  styleUrls: ['./credentials-dialog.component.css'],
})
export class CredentialsDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<CredentialsDialogComponent>);
  public readonly data: CredentialsDialogData = inject(MAT_DIALOG_DATA);

  public readonly copied = signal<boolean>(false);

  /**
   * Copia la contraseña temporal al portapapeles del sistema y muestra retroalimentación visual.
   */
  public async copyPassword(): Promise<void> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.data.temporaryPassword);
      } else {
        // Fallback para entornos donde Clipboard API no esté disponible
        const textArea = document.createElement('textarea');
        textArea.value = this.data.temporaryPassword;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 2500);
    } catch {
      // Si falla la copia automática, el usuario aún puede seleccionar y copiar manualmente
    }
  }

  public onClose(): void {
    this.dialogRef.close(true);
  }
}
