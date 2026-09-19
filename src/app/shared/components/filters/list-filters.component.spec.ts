import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ListFiltersComponent } from './list-filters.component';
import { FilterSelect, FilterToggle } from '../../models/data-table.models';

describe('ListFiltersComponent', () => {
  let component: ListFiltersComponent;
  let fixture: ComponentFixture<ListFiltersComponent>;

  const mockSelects: FilterSelect[] = [
    {
      key: 'roleId',
      label: 'Rol',
      options: [
        { value: 'role-1', label: 'Admin' },
        { value: 'role-2', label: 'Vendedor' },
      ],
    },
  ];

  const mockToggles: FilterToggle[] = [
    {
      key: 'isActive',
      label: 'Solo activos',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [ListFiltersComponent],
    });

    fixture = TestBed.createComponent(ListFiltersComponent);
    component = fixture.componentInstance;
    component.selects = mockSelects;
    component.toggles = mockToggles;
    component.debounceMs = 200;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con selects y toggles', () => {
    expect(component).toBeTruthy();
    const select = fixture.nativeElement.querySelector('select');
    expect(select).toBeTruthy();
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
  });

  it('debe emitir filterChange tras el tiempo de debounce cuando se escribe en la búsqueda', (done) => {
    component.filterChange.subscribe((state) => {
      expect(state as any).toEqual({
        search: 'carlos',
        roleId: null,
        isActive: null,
      });
      done();
    });

    component.onSearchInput('carlos');
  });

  it('debe emitir filterChange cuando se cambia un select', () => {
    let emittedState: Record<string, unknown> | null = null;
    component.filterChange.subscribe((state) => {
      emittedState = state;
    });

    component.onSelectChange('roleId', 'role-2');

    expect(emittedState as any).toEqual({
      search: '',
      roleId: 'role-2',
      isActive: null,
    });
  });

  it('debe emitir filterChange cuando se activa un toggle', () => {
    let emittedState: Record<string, unknown> | null = null;
    component.filterChange.subscribe((state) => {
      emittedState = state;
    });

    component.onToggleChange('isActive', true);

    expect(emittedState as any).toEqual({
      search: '',
      roleId: null,
      isActive: true,
    });
  });

  it('resetFilters() debe limpiar los valores y emitir estado nulo/vacío', () => {
    component.searchTerm = 'filtro previo';
    component.selectValues = { roleId: 'role-1' };
    component.toggleValues = { isActive: true };

    let emittedState: Record<string, unknown> | null = null;
    component.filterChange.subscribe((state) => {
      emittedState = state;
    });

    component.resetFilters();

    expect(component.searchTerm).toBe('');
    expect(component.selectValues).toEqual({});
    expect(component.toggleValues).toEqual({});
    expect(emittedState as any).toEqual({
      search: '',
      roleId: null,
      isActive: null,
    });
  });

  it('hasActiveFilters() debe retornar true solo si hay algún filtro o búsqueda activa', () => {
    expect(component.hasActiveFilters()).toBeFalse();

    component.searchTerm = 'test';
    expect(component.hasActiveFilters()).toBeTrue();

    component.searchTerm = '';
    component.selectValues = { roleId: 'role-1' };
    expect(component.hasActiveFilters()).toBeTrue();

    component.selectValues = {};
    component.toggleValues = { isActive: true };
    expect(component.hasActiveFilters()).toBeTrue();

    component.toggleValues = { isActive: false };
    expect(component.hasActiveFilters()).toBeFalse();
  });

  it('activeFiltersCount debe calcular correctamente la cantidad de filtros activos', () => {
    expect(component.activeFiltersCount).toBe(0);

    component.searchTerm = 'admin';
    expect(component.activeFiltersCount).toBe(1);

    component.selectValues = { roleId: 'role-1' };
    expect(component.activeFiltersCount).toBe(2);

    component.toggleValues = { isActive: true };
    expect(component.activeFiltersCount).toBe(3);
  });

  it('isSelectActive() debe indicar si un select tiene un valor asignado válido', () => {
    expect(component.isSelectActive('roleId')).toBeFalse();

    component.selectValues = { roleId: 'role-2' };
    expect(component.isSelectActive('roleId')).toBeTrue();

    component.selectValues = { roleId: '' };
    expect(component.isSelectActive('roleId')).toBeFalse();
  });
});
