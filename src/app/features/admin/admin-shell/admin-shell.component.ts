import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
  ],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals de Estado del Layout ---
  public readonly isMobileOpen = signal<boolean>(false);
  public readonly isSidebarCollapsed = signal<boolean>(false);

  constructor() {
    // Cierra el drawer móvil automáticamente al navegar a cualquier ruta
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  public toggleMobileMenu(): void {
    this.isMobileOpen.update((val) => !val);
  }

  public closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }

  public toggleSidebarCollapse(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  /**
   * Ejecuta el cierre de sesión:
   * 1. Notifica al backend (stateless).
   * 2. Limpia tokens y estado de sesión en memoria/almacenamiento.
   * 3. Informa al usuario y redirige a la pantalla de login.
   */
  public handleLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.finalizeLogout();
      },
      error: () => {
        this.finalizeLogout();
      },
    });
  }

  private finalizeLogout(): void {
    this.authState.clearSession();
    this.snackBar.open('Sesión finalizada correctamente.', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
    this.router.navigate(['/login']);
  }
}
