/**
 * Tipos de datos soportados para formateo automático en celdas de la tabla.
 */
export type ColumnType = 'text' | 'date' | 'currency';

/**
 * Alineación horizontal del contenido de la columna.
 */
export type ColumnAlign = 'left' | 'center' | 'right';

/**
 * Definición de una columna para app-data-table.
 */
export interface DataTableColumn<T = any> {
  /** Clave de la propiedad del objeto fila. Si se omite, la columna requiere un template personalizado. */
  key?: keyof T | string;
  /** Título visible en el encabezado de la columna. */
  header: string;
  /** Tipo de formato de datos (aplica pipes automáticos si key está presente). */
  type?: ColumnType;
  /** Ancho CSS sugerido (ej. '120px', '20%', 'minmax(180px, 1fr)'). */
  width?: string;
  /** Si es true, fija la columna al extremo derecho en scroll horizontal móvil. */
  stickyEnd?: boolean;
  /** Alineación del texto en encabezado y celdas. */
  align?: ColumnAlign;
}

/**
 * Opción individual para un selector de filtro.
 */
export interface FilterSelectOption<V = unknown> {
  value: V;
  label: string;
}

/**
 * Definición de un selector dropdown para app-list-filters.
 */
export interface FilterSelect<V = unknown> {
  key: string;
  label: string;
  options: FilterSelectOption<V>[];
  allowClear?: boolean;
}

/**
 * Definición de un toggle o switch para app-list-filters.
 */
export interface FilterToggle {
  key: string;
  label: string;
}
