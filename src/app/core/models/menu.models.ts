/**
 * Representa un ítem u opción dentro del árbol de navegación data-driven.
 */
export interface MenuItem {
  id: string;
  code: string;
  name: string;
  icon: string;
  route: string;
  order: number;
  badge?: string;
  children: MenuItem[];
}

/**
 * Respuesta del endpoint GET /modules/menu
 */
export interface MenuResponse {
  menu: MenuItem[];
}
