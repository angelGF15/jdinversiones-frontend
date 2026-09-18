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
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

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
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
        if (this.showTimeout) {
          clearTimeout(this.showTimeout);
          this.showTimeout = null;
        }

        const currentUrl = (this.router?.url || '').toLowerCase();
        const targetUrl = (event.url || '').toLowerCase();

        const currentPath = currentUrl.split('?')[0].split('#')[0];
        const targetPath = targetUrl.split('?')[0].split('#')[0];

        // 1. Si es la misma ruta base (ej. cambio de queryParams en paginación o filtros de búsqueda),
        // nunca activar el skeleton loader global de pantalla completa.
        if (currentPath === targetPath && currentPath !== '') {
          return;
        }

        // 2. Si es navegación interna dentro del mismo shell administrativo (/admin/* -> /admin/*),
        // preservar el layout del shell real y no taparlo con un esqueleto genérico.
        if (currentPath.startsWith('/admin') && targetPath.startsWith('/admin')) {
          return;
        }

        // 3. Para transiciones de layout raíz (ej. /login <-> /admin), usar un umbral de 150ms
        // para no mostrar destellos si la navegación ocurre instantáneamente en memoria.
        let targetVariant: SkeletonVariant = 'full';
        if (targetUrl === '/login' || targetUrl.startsWith('/login')) {
          targetVariant = 'login';
        } else if (targetUrl === '/admin' || targetUrl.startsWith('/admin')) {
          targetVariant = 'admin';
        }

        this.isNavigating = true;
        this.showTimeout = setTimeout(() => {
          this._variant.set(targetVariant);
          this._isLoading.set(true);
        }, 150);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating = false;
        if (this.showTimeout) {
          clearTimeout(this.showTimeout);
          this.showTimeout = null;
        }
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }

        if (this._isLoading()) {
          this.hideTimeout = setTimeout(() => {
            this.activeRequests = 0;
            this._isLoading.set(false);
            this._message.set(null);
          }, 60);
        } else {
          this.activeRequests = 0;
        }
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
