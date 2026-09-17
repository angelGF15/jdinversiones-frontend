import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  it('debe emitir filterChange tras el tiempo de debounce cuando se escribe en la búsqueda', fakeAsync(() => {
    let emittedState: Record<string, unknown> | null = null;
    component.filterChange.subscribe((state) => {
      emittedState = state;
    });

    component.onSearchInput('carlos');
    expect(emittedState).toBeNull();

    tick(200);
    expect(emittedState).toEqual({
      search: 'carlos',
      roleId: null,
      isActive: null,
    });
  }));

  it('debe emitir filterChange cuando se cambia un select', () => {
    let emittedState: Record<string, unknown> | null = null;
    component.filterChange.subscribe((state) => {
      emittedState = state;
    });

    component.onSelectChange('roleId', 'role-2');

    expect(emittedState).toEqual({
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

    expect(emittedState).toEqual({
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
    expect(emittedState).toEqual({
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
});
