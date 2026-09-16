import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItem, MenuResponse } from '../models/menu.models';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // --- Signals de Estado del Menú ---
  private readonly _menu = signal<MenuItem[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  public readonly menu = this._menu.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  // Diccionario de traducción de nombres de Lucide Icons a Material Icons
  private static readonly LUCIDE_TO_MATERIAL_MAP: Record<string, string> = {
    // Generales / Dashboard
    layoutdashboard: 'dashboard',
    dashboard: 'dashboard',
    home: 'home',
    activity: 'insights',

    // Inventario y Productos
    package: 'inventory_2',
    box: 'inventory',
    boxes: 'inventory',
    archive: 'archive',
    tag: 'sell',
    tags: 'style',
    barcode: 'qr_code_2',

    // Ventas y Comercio
    shoppingbag: 'shopping_bag',
    shoppingcart: 'shopping_cart',
    store: 'storefront',
    pointofsale: 'point_of_sale',
    creditcard: 'credit_card',
    receipt: 'receipt_long',
    dollar: 'attach_money',
    dollartsign: 'attach_money',

    // Usuarios y Clientes
    users: 'people_alt',
    user: 'person',
    usercog: 'manage_accounts',
    usercheck: 'how_to_reg',
    userplus: 'person_add',
    userminus: 'person_remove',
    contact: 'contact_page',

    // Seguridad y Roles
    shield: 'admin_panel_settings',
    shieldcheck: 'verified_user',
    key: 'vpn_key',
    lock: 'lock',
    unlock: 'lock_open',

    // Configuración y Sistema
    settings: 'settings',
    wrench: 'build',
    sliders: 'tune',
    slidershorizontal: 'tune',
    tool: 'construction',
    database: 'dns',
    server: 'dns',

    // Reportes y Analíticas
    analytics: 'analytics',
    barchart: 'bar_chart',
    barchart2: 'bar_chart',
    linechart: 'show_chart',
    piechart: 'pie_chart',
    trendingup: 'trending_up',
    trendingdown: 'trending_down',
    filetext: 'description',
    filespreadsheet: 'table_chart',

    // Otros comunes
    truck: 'local_shipping',
    calendar: 'calendar_month',
    clock: 'schedule',
    bell: 'notifications',
    helpcircle: 'help_outline',
    info: 'info',
    alerttriangle: 'warning',
  };

  /**
   * Carga el árbol de navegación del usuario desde GET /modules/menu.
   * El token Bearer es inyectado automáticamente por authInterceptor.
   */
  public loadMenu(): Observable<MenuItem[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<MenuResponse>(`${this.apiUrl}/modules/menu`).pipe(
      map((response) => {
        const rawMenu = response?.menu ?? [];
        return this.sortMenu(rawMenu);
      }),
      tap({
        next: (items) => {
          this._menu.set(items);
          this._isLoading.set(false);
        },
        error: (err) => {
          const errorMessage =
            err?.error?.message || err?.message || 'Error al cargar las opciones del menú';
          this._error.set(errorMessage);
          this._isLoading.set(false);
        },
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * Limpia el menú en memoria (por ejemplo, al cerrar sesión).
   */
  public clearMenu(): void {
    this._menu.set([]);
    this._isLoading.set(false);
    this._error.set(null);
  }

  /**
   * Mapea un identificador de icono (Lucide o estándar) a su equivalente en Material Icons.
   */
  public getMaterialIcon(iconName: string | undefined | null): string {
    if (!iconName) {
      return 'folder';
    }

    const normalized = iconName.toLowerCase().replace(/[-_\s]/g, '');
    if (MenuService.LUCIDE_TO_MATERIAL_MAP[normalized]) {
      return MenuService.LUCIDE_TO_MATERIAL_MAP[normalized];
    }

    // Si ya viene en formato de Material Icons (snake_case o palabra minúscula)
    if (/^[a-z0-9_]+$/.test(iconName)) {
      return iconName;
    }

    return 'folder';
  }

  /**
   * Ordena recursivamente el árbol de menús según la propiedad order.
   */
  private sortMenu(items: MenuItem[]): MenuItem[] {
    return items
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item) => ({
        ...item,
        children: item.children ? this.sortMenu(item.children) : [],
      }));
  }
}
