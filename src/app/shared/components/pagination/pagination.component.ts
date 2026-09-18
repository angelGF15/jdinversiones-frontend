import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  /** Página actual (1-based, semántica natural del backend). */
  @Input() page = 1;

  /** Cantidad de registros por página. */
  @Input() pageSize = 20;

  /** Total acumulado de registros en el backend. */
  @Input() total = 0;

  /** Total de páginas calculadas por el backend. */
  @Input() totalPages = 1;

  /** Opciones disponibles para el tamaño de página. */
  @Input() pageSizeOptions: number[] = [10, 20, 50];

  /** Texto del separador central (por defecto 'DE', p. ej. '3 DE 10' o '3 OF 10'). */
  @Input() separator = 'de';

  /** Evento emitido al cambiar de página (1-based). */
  @Output() pageChange = new EventEmitter<number>();

  /** Evento emitido al seleccionar un nuevo tamaño de página. */
  @Output() pageSizeChange = new EventEmitter<number>();

  /**
   * Índice del primer registro visible en la página actual.
   */
  public get fromItem(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  /**
   * Índice del último registro visible en la página actual.
   */
  public get toItem(): number {
    if (this.total === 0) return 0;
    return Math.min(this.page * this.pageSize, this.total);
  }

  /**
   * Determina si es posible retroceder una página.
   */
  public get canPrev(): boolean {
    return this.page > 1;
  }

  /**
   * Determina si es posible avanzar a la página siguiente.
   */
  public get canNext(): boolean {
    return this.page < this.totalPages;
  }

  public onFirst(): void {
    if (this.canPrev) {
      this.pageChange.emit(1);
    }
  }

  public onPrev(): void {
    if (this.canPrev) {
      this.pageChange.emit(this.page - 1);
    }
  }

  public onNext(): void {
    if (this.canNext) {
      this.pageChange.emit(this.page + 1);
    }
  }

  public onLast(): void {
    if (this.canNext) {
      this.pageChange.emit(this.totalPages);
    }
  }

  public onSizeSelect(size: unknown): void {
    const parsed = Number(size);
    if (!Number.isNaN(parsed) && parsed !== this.pageSize) {
      this.pageSizeChange.emit(parsed);
    }
  }
}
