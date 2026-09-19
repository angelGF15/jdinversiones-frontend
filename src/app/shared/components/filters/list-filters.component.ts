import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterSelect, FilterToggle } from '../../models/data-table.models';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list-filters.component.html',
  styleUrls: ['./list-filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFiltersComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);

  /** Texto de marcador de posición para el campo de búsqueda rápida. */
  @Input() searchPlaceholder = 'Buscar registros...';

  /** Tiempo de espera en milisegundos para la emisión con debounce del texto de búsqueda. */
  @Input() debounceMs = 300;

  /** Lista de selectores desplegables configurados. */
  @Input() selects: FilterSelect[] = [];

  /** Lista de interruptores (toggles) booleanos configurados. */
  @Input() toggles: FilterToggle[] = [];

  /** Muestra u oculta el botón de restablecer filtros. */
  @Input() showReset = true;

  /** Valores iniciales para hidratar los controles (ej. desde queryParams). */
  @Input() initialValues?: Record<string, unknown>;

  /** Evento emitido con el mapa completo de filtros actualizados. */
  @Output() filterChange = new EventEmitter<Record<string, unknown>>();

  public searchTerm = '';
  public selectValues: Record<string, unknown> = {};
  public toggleValues: Record<string, boolean> = {};

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(this.debounceMs),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.emitFilterState();
      });

    if (this.initialValues) {
      this.hydrateFromInitial(this.initialValues);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValues'] && !changes['initialValues'].firstChange && this.initialValues) {
      this.hydrateFromInitial(this.initialValues);
    }
  }

  private hydrateFromInitial(values: Record<string, unknown>): void {
    if (values['search'] !== undefined && values['search'] !== null) {
      this.searchTerm = String(values['search']);
    }

    for (const sel of this.selects) {
      if (values[sel.key] !== undefined) {
        this.selectValues[sel.key] = values[sel.key];
      }
    }

    for (const tog of this.toggles) {
      if (values[tog.key] !== undefined) {
        this.toggleValues[tog.key] = values[tog.key] === true || values[tog.key] === 'true';
      }
    }
  }

  public onSearchInput(val: string): void {
    this.searchTerm = val;
    this.searchSubject.next(val);
  }

  public clearSearch(): void {
    if (this.searchTerm) {
      this.searchTerm = '';
      this.searchSubject.next('');
    }
  }

  public onSelectChange(key: string, value: unknown): void {
    // Si se seleccionó la opción vacía o 'null', lo marcamos como nulo
    this.selectValues[key] = value === '' || value === 'null' || value === undefined ? null : value;
    this.emitFilterState();
  }

  public onToggleChange(key: string, checked: boolean): void {
    this.toggleValues[key] = checked;
    this.emitFilterState();
  }

  public resetFilters(): void {
    this.searchTerm = '';
    this.selectValues = {};
    this.toggleValues = {};

    const resetState: Record<string, unknown> = { search: '' };
    for (const sel of this.selects) {
      resetState[sel.key] = null;
    }
    for (const tog of this.toggles) {
      resetState[tog.key] = null;
    }

    this.filterChange.emit(resetState);
  }

  public hasActiveFilters(): boolean {
    if (this.searchTerm && this.searchTerm.trim().length > 0) return true;
    for (const key of Object.keys(this.selectValues)) {
      if (this.selectValues[key] !== null && this.selectValues[key] !== undefined && this.selectValues[key] !== '') {
        return true;
      }
    }
    for (const key of Object.keys(this.toggleValues)) {
      if (this.toggleValues[key] === true) return true;
    }
    return false;
  }

  /** Retorna el número total de filtros actualmente activos. */
  public get activeFiltersCount(): number {
    let count = 0;
    if (this.searchTerm && this.searchTerm.trim().length > 0) count++;
    for (const key of Object.keys(this.selectValues)) {
      if (this.selectValues[key] !== null && this.selectValues[key] !== undefined && this.selectValues[key] !== '') {
        count++;
      }
    }
    for (const key of Object.keys(this.toggleValues)) {
      if (this.toggleValues[key] === true) count++;
    }
    return count;
  }

  /** Determina si un selector específico tiene un valor seleccionado diferente al default. */
  public isSelectActive(key: string): boolean {
    const val = this.selectValues[key];
    return val !== null && val !== undefined && val !== '';
  }

  private emitFilterState(): void {
    const state: Record<string, unknown> = {};

    state['search'] = this.searchTerm && this.searchTerm.trim().length > 0 ? this.searchTerm.trim() : '';

    for (const sel of this.selects) {
      const val = this.selectValues[sel.key];
      state[sel.key] = val !== undefined && val !== null && val !== '' ? val : null;
    }

    for (const tog of this.toggles) {
      const val = this.toggleValues[tog.key];
      state[tog.key] = val !== undefined ? val : null;
    }

    this.filterChange.emit(state);
  }
}
