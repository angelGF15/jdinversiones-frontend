import { Signal, signal, computed } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface ListQueryStateOptions<Q> {
  defaultPage?: number;
  defaultPageSize?: number;
  defaultFilters?: Partial<Q>;
  pageKey?: string;
  pageSizeKey?: string;
}

/**
 * Gestor de estado de consulta de listados sincronizado bidireccionalmente con la URL (Deep-linking).
 *
 * Satisface los principios de RNF-05:
 * 1. Hidratación inicial desde queryParams de la ruta activa.
 * 2. Señales reactivas desacopladas (`state`, `page`, `pageSize`, `filters`).
 * 3. Actualización de URL con replaceUrl (sin ensuciar el historial del navegador).
 * 4. Guarda anti-bucle de navegación y compatibilidad con botón atrás/adelante.
 */
export class ListQueryState<Q extends Record<string, any> = Record<string, any>> {
  private readonly router: Router;
  private readonly route: ActivatedRoute;
  private readonly pageKey: string;
  private readonly pageSizeKey: string;
  private readonly defaultPage: number;
  private readonly defaultPageSize: number;
  private readonly defaultFilters: Record<string, unknown>;

  private readonly _page = signal<number>(1);
  private readonly _pageSize = signal<number>(20);
  private readonly _filters = signal<Record<string, unknown>>({});

  private isWritingToUrl = false;
  private readonly sub: Subscription;

  /** Señal de solo lectura para la página actual (1-based). */
  public readonly page: Signal<number> = this._page.asReadonly();

  /** Señal de solo lectura para el tamaño de página. */
  public readonly pageSize: Signal<number> = this._pageSize.asReadonly();

  /** Señal de solo lectura con los filtros activos. */
  public readonly filters: Signal<Record<string, unknown>> = this._filters.asReadonly();

  /**
   * Estado completo de la consulta (filtros + página + límite) tipado con el modelo Q.
   * Listo para ser consumido directamente por el servicio HTTP (ej. UsersService.list).
   */
  public readonly state = computed<Q>(() => {
    return {
      ...this._filters(),
      [this.pageKey]: this._page(),
      [this.pageSizeKey]: this._pageSize(),
    } as unknown as Q;
  });

  constructor(
    route: ActivatedRoute,
    router: Router,
    options: ListQueryStateOptions<Q> = {}
  ) {
    this.route = route;
    this.router = router;
    this.pageKey = options.pageKey ?? 'page';
    this.pageSizeKey = options.pageSizeKey ?? 'limit';
    this.defaultPage = options.defaultPage ?? 1;
    this.defaultPageSize = options.defaultPageSize ?? 20;
    this.defaultFilters = (options.defaultFilters ?? {}) as Record<string, unknown>;

    // 1. Hidratación inmediata desde el snapshot inicial
    this.hydrateFromParams(this.route.snapshot.queryParams);

    // 2. Suscripción a cambios de queryParams (soporta botón atrás/adelante del navegador)
    this.sub = this.route.queryParams.subscribe((params) => {
      if (!this.isWritingToUrl) {
        this.hydrateFromParams(params);
      }
    });
  }

  /**
   * Lee e hidrata las señales internas a partir de los queryParams.
   */
  private hydrateFromParams(params: Params): void {
    const rawPage = params[this.pageKey];
    const rawSize = params[this.pageSizeKey];

    const parsedPage = rawPage !== undefined && rawPage !== null ? parseInt(rawPage, 10) : this.defaultPage;
    const parsedSize = rawSize !== undefined && rawSize !== null ? parseInt(rawSize, 10) : this.defaultPageSize;

    this._page.set(Number.isNaN(parsedPage) || parsedPage < 1 ? this.defaultPage : parsedPage);
    this._pageSize.set(Number.isNaN(parsedSize) || parsedSize < 1 ? this.defaultPageSize : parsedSize);

    const nextFilters: Record<string, unknown> = { ...this.defaultFilters };
    for (const key of Object.keys(params)) {
      if (key !== this.pageKey && key !== this.pageSizeKey) {
        let val: unknown = params[key];
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        nextFilters[key] = val;
      }
    }
    this._filters.set(nextFilters);
  }

  /**
   * Actualiza los filtros del listado, resetea la paginación a la página 1
   * y sincroniza la URL sin recargar la página.
   */
  public updateFilters(newFilters: Record<string, unknown>): void {
    const merged = { ...this._filters(), ...newFilters };

    for (const key of Object.keys(merged)) {
      if (merged[key] === null || merged[key] === undefined || merged[key] === '') {
        delete merged[key];
      }
    }

    this._filters.set(merged);
    this._page.set(1);
    this.applyToUrl();
  }

  /**
   * Cambia la página actual y sincroniza la URL.
   */
  public setPage(newPage: number): void {
    const validPage = Math.max(1, newPage);
    if (this._page() !== validPage) {
      this._page.set(validPage);
      this.applyToUrl();
    }
  }

  /**
   * Cambia el tamaño de página, resetea a página 1 y sincroniza la URL.
   */
  public setSize(newSize: number): void {
    const validSize = Math.max(1, newSize);
    if (this._pageSize() !== validSize) {
      this._pageSize.set(validSize);
      this._page.set(1);
      this.applyToUrl();
    }
  }

  /**
   * Restablece todos los filtros y la paginación a los valores por defecto iniciales.
   */
  public reset(): void {
    this._filters.set({ ...this.defaultFilters });
    this._page.set(this.defaultPage);
    this._pageSize.set(this.defaultPageSize);
    this.applyToUrl();
  }

  /**
   * Escribe el estado actual en los queryParams del Router usando replaceUrl y guarda anti-bucle.
   */
  public applyToUrl(): void {
    this.isWritingToUrl = true;

    const currentFilters = this._filters();
    const queryParams: Record<string, any> = {
      [this.pageKey]: this._page(),
      [this.pageSizeKey]: this._pageSize(),
    };

    // Agregar filtros activos
    for (const key of Object.keys(currentFilters)) {
      const val = currentFilters[key];
      queryParams[key] = val !== null && val !== undefined && val !== '' ? val : null;
    }

    // Limpiar de la URL cualquier parámetro previo que ya no esté en los filtros
    const currentRouteParams = this.route.snapshot.queryParams;
    for (const key of Object.keys(currentRouteParams)) {
      if (key !== this.pageKey && key !== this.pageSizeKey && !(key in currentFilters)) {
        queryParams[key] = null;
      }
    }

    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .finally(() => {
        setTimeout(() => {
          this.isWritingToUrl = false;
        }, 0);
      });
  }

  /**
   * Limpia la suscripción reactiva a queryParams al destruir el componente contenedor.
   */
  public destroy(): void {
    this.sub.unsubscribe();
  }
}
