import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChildren,
  QueryList,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { DataTableColumn, ColumnAlign } from '../../models/data-table.models';
import { DataTableColumnDirective } from './data-table-column.directive';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<Row = any> {
  /** Lista de definiciones de columnas a renderizar. */
  @Input() columns: DataTableColumn<Row>[] = [];

  /** Conjunto de datos de la página actual. */
  @Input() data: Row[] = [];

  /** Indica si la tabla está cargando datos del backend (muestra skeleton shimmer). */
  @Input() loading = false;

  /** Función trackBy personalizada para optimización de rendimiento con @for. */
  @Input() rowTrackBy?: (index: number, item: Row) => any;

  /** Título para el estado sin registros. */
  @Input() emptyTitle = 'Sin resultados';

  /** Descripción explicativa para el estado sin registros. */
  @Input() emptyDescription = 'No se encontraron registros que coincidan con la búsqueda o filtros aplicados.';

  /** Nombre del icono Material a mostrar en el estado vacío. */
  @Input() emptyIcon = 'inbox';

  /** Atributo aria-label para accesibilidad de lectores de pantalla. */
  @Input() ariaLabel = 'Tabla de datos';

  /** Evento emitido al hacer clic en una fila de datos. */
  @Output() rowClick = new EventEmitter<Row>();

  /** Colección de plantillas de celda inyectadas mediante directiva [dataTableColumn]. */
  @ContentChildren(DataTableColumnDirective)
  cellTemplates!: QueryList<DataTableColumnDirective>;

  /** Número de filas de esqueleto a dibujar en estado de carga. */
  protected readonly skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  /**
   * Obtiene la plantilla asociada a una columna dada si fue proyectada por el consumidor.
   */
  public getTemplate(name: string): TemplateRef<any> | null {
    if (!this.cellTemplates) return null;
    const match = this.cellTemplates.find((t) => t.name === name);
    return match ? match.templateRef : null;
  }

  /**
   * Extrae el valor de la celda de forma segura a partir de la clave especificada.
   */
  public getCellValue(row: any, key: any): any {
    if (!row || key === undefined || key === null) return '';
    return row[key] ?? '';
  }

  /**
   * Maneja el clic en una fila emitiendo el evento correspondiente.
   */
  public onRowClick(row: Row): void {
    this.rowClick.emit(row);
  }

  /**
   * Retorna las clases de alineación horizontal para una columna.
   */
  public getAlignmentClass(align?: ColumnAlign): string {
    switch (align) {
      case 'right':
        return 'text-right justify-end';
      case 'center':
        return 'text-center justify-center';
      default:
        return 'text-left justify-start';
    }
  }

  /**
   * Función de tracking por defecto para filas.
   */
  public defaultTrackBy(index: number, item: any): any {
    if (this.rowTrackBy) return this.rowTrackBy(index, item);
    return item?.id ?? item?.userId ?? item?.code ?? index;
  }
}
