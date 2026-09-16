import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';

export type LoginErrorType = 'validation' | 'credentials' | 'suspended' | 'rate-limit' | 'network' | null;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  // --- Signals de Estado ---
  public readonly hidePassword = signal<boolean>(true);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly errorType = signal<LoginErrorType>(null);

  // Formulario Reactivo con validaciones alineadas al backend
  public readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // URL de retorno tras autenticación exitosa (default: /admin)
  private get returnUrl(): string {
    return this.route.snapshot.queryParams['returnUrl'] || '/admin';
  }

  /**
   * Alterna la visibilidad del campo de contraseña.
   */
  public togglePasswordVisibility(): void {
    this.hidePassword.update((val) => !val);
  }

  /**
   * Procesa el envío del formulario de inicio de sesión.
   */
  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.errorType.set(null);

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: (response) => {
        // Almacena sesión completa (tokens y perfil)
        this.authState.setSession(response);

        this.snackBar.open('¡Bienvenido al sistema!', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });

        // Redirige al returnUrl solicitado o al dashboard
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.handleLoginError(error);
      },
    });
  }

  /**
   * Mapea los códigos de estado HTTP del backend al contrato de errores de la UI.
   */
  private handleLoginError(error: HttpErrorResponse): void {
    let message = 'Error de conexión con el servidor. Verifica tu red e intenta nuevamente.';
    let type: LoginErrorType = 'network';

    switch (error.status) {
      case 400:
        message = 'Datos de acceso incompletos o en formato inválido.';
        type = 'validation';
        break;
      case 401:
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        type = 'credentials';
        break;
      case 403:
        message = 'El usuario se encuentra inactivo o suspendido. Contacta al administrador.';
        type = 'suspended';
        break;
      case 429:
        message = 'Demasiados intentos fallidos. Por seguridad, espera 1 minuto antes de reintentar.';
        type = 'rate-limit';
        break;
      default:
        if (error.error?.message && typeof error.error.message === 'string') {
          message = error.error.message;
        }
        break;
    }

    this.errorMessage.set(message);
    this.errorType.set(type);

    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
