import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthState } from '../../../../../core/auth/auth.state';
import { ThemeService } from '../../../../../core/services/theme.service';
import { AvatarUploadDialogComponent } from '../../../../../shared/components/avatar-upload-dialog/avatar-upload-dialog.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly authState = inject(AuthState);
  public readonly themeService = inject(ThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  public readonly avatarImgError = signal(false);

  constructor() {
    effect(() => {
      // Re-evalúa cuando cambia el avatarUrl del authState y resetea posibles errores de carga
      this.authState.avatarUrl();
      this.avatarImgError.set(false);
    });
  }

  @Input() isSidebarCollapsed = false;

  @Output() toggleMobileMenu = new EventEmitter<void>();
  @Output() toggleSidebarCollapse = new EventEmitter<void>();
  @Output() logoutTriggered = new EventEmitter<void>();

  public onLogout(): void {
    this.logoutTriggered.emit();
  }

  public openAvatarDialog(): void {
    const dialogRef = this.dialog.open(AvatarUploadDialogComponent, {
      data: {
        avatarUrl: this.authState.avatarUrl(),
        userName: this.authState.fullName(),
      },
      panelClass: 'avatar-dialog-panel',
      autoFocus: false,
      maxWidth: '460px',
      width: '100%',
    });

    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        this.snackBar.open('Avatar actualizado correctamente.', 'Entendido', {
          duration: 3500,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
        });
      }
    });
  }
}
