import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Observable, finalize } from 'rxjs';

export type SkeletonVariant = 'login' | 'admin' | 'full';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly router = inject(Router, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // --- Signals de Estado Global ---
  private readonly _isLoading = signal<boolean>(false);
  private readonly _variant = signal<SkeletonVariant>('full');
  private readonly _message = signal<string | null>(null);

  public readonly isLoading = this._isLoading.asReadonly();
  public readonly variant = this._variant.asReadonly();
  public readonly message = this._message.asReadonly();

  // Estados independientes para navegación del router y peticiones manuales
  private isNavigating = false;
  private activeRequests = 0;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.setupRouterListener();
  }

  /**
   * Configura la escucha de eventos de navegación para activar automáticamente
   * el esqueleto correspondiente al destino de la ruta.
   * Maneja redirecciones y transiciones sin desincronizar contadores.
   */
  private setupRouterListener(): void {
    if (!this.isBrowser || !this.router) return;

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isNavigating = true;
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }

        const targetUrl = event.url.toLowerCase();
        let targetVariant: SkeletonVariant = 'full';

        if (targetUrl === '/login' || targetUrl.startsWith('/login')) {
          targetVariant = 'login';
        } else if (targetUrl === '/admin' || targetUrl.startsWith('/admin')) {
          targetVariant = 'admin';
        }

        this._variant.set(targetVariant);
        this._isLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating = false;
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
        // Micro-retraso suave para permitir que el DOM del nuevo componente se monte sin parpadeo brusco
        this.hideTimeout = setTimeout(() => {
          this.activeRequests = 0; // Garantiza que no queden peticiones colgadas de redirecciones
          this._isLoading.set(false);
          this._message.set(null);
        }, 80);
      }
    });
  }

  /**
   * Muestra el Skeleton Loader global con la variante solicitada de forma programática.
   */
  public show(variant: SkeletonVariant = 'full', message: string | null = null): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.activeRequests++;
    this._variant.set(variant);
    if (message !== null) {
      this._message.set(message);
    }
    this._isLoading.set(true);
  }

  /**
   * Oculta el Skeleton Loader global cuando todas las peticiones o navegaciones finalizan.
   */
  public hide(force: boolean = false): void {
    if (force) {
      this.activeRequests = 0;
      this.isNavigating = false;
    } else if (this.activeRequests > 0) {
      this.activeRequests--;
    }

    if (!this.isNavigating && this.activeRequests <= 0) {
      this.activeRequests = 0;
      this._isLoading.set(false);
      this._message.set(null);
    }
  }

  /**
   * Envoltorio para observables: activa el skeleton durante la ejecución y lo oculta en finalize.
   */
  public withLoading<T>(obs$: Observable<T>, variant: SkeletonVariant = 'full'): Observable<T> {
    this.show(variant);
    return obs$.pipe(
      finalize(() => {
        this.hide();
      })
    );
  }
}
