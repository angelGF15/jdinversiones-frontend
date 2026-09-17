import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ListQueryState } from './list-query-state';

describe('ListQueryState', () => {
  let mockRoute: any;
  let mockRouter: any;
  let queryParamsSubject: Subject<any>;

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();
    mockRoute = {
      snapshot: { queryParams: {} },
      queryParams: queryParamsSubject.asObservable(),
    };
    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
    };
  });

  afterEach(() => {
    queryParamsSubject.complete();
  });

  it('debe inicializarse con valores por defecto cuando no hay queryParams', () => {
    const queryState = new ListQueryState(mockRoute, mockRouter);

    expect(queryState.page()).toBe(1);
    expect(queryState.pageSize()).toBe(20);
    expect(queryState.filters()).toEqual({});
    expect(queryState.state()).toEqual({ page: 1, limit: 20 });

    queryState.destroy();
  });

  it('debe hidratar el estado inicial desde snapshot.queryParams', () => {
    mockRoute.snapshot.queryParams = {
      page: '3',
      limit: '50',
      search: 'carlos',
      isActive: 'true',
      roleId: 'role-123',
    };

    const queryState = new ListQueryState(mockRoute, mockRouter);

    expect(queryState.page()).toBe(3);
    expect(queryState.pageSize()).toBe(50);
    expect(queryState.filters()).toEqual({
      search: 'carlos',
      isActive: true,
      roleId: 'role-123',
    });
    expect(queryState.state()).toEqual({
      page: 3,
      limit: 50,
      search: 'carlos',
      isActive: true,
      roleId: 'role-123',
    });

    queryState.destroy();
  });

  it('updateFilters() debe actualizar los filtros, resetear page a 1 y navegar con replaceUrl', () => {
    const queryState = new ListQueryState(mockRoute, mockRouter);
    queryState.setPage(4);

    expect(queryState.page()).toBe(4);

    queryState.updateFilters({ search: 'ana', roleId: 'role-1' });

    expect(queryState.page()).toBe(1);
    expect(queryState.filters()).toEqual({ search: 'ana', roleId: 'role-1' });
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({
          page: 1,
          limit: 20,
          search: 'ana',
          roleId: 'role-1',
        }),
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
    );

    queryState.destroy();
  });

  it('updateFilters() debe limpiar claves nulas o vacías', () => {
    mockRoute.snapshot.queryParams = { search: 'antiguo' };
    const queryState = new ListQueryState(mockRoute, mockRouter);

    queryState.updateFilters({ search: null });

    expect(queryState.filters()).toEqual({});

    queryState.destroy();
  });

  it('setPage() debe actualizar la página y llamar al router si el valor es diferente', () => {
    const queryState = new ListQueryState(mockRoute, mockRouter);

    queryState.setPage(2);
    expect(queryState.page()).toBe(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ page: 2, limit: 20 }),
        replaceUrl: true,
      })
    );

    // Si se envía el mismo valor, no debe volver a navegar
    mockRouter.navigate.calls.reset();
    queryState.setPage(2);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    queryState.destroy();
  });

  it('setSize() debe actualizar el tamaño, resetear a página 1 y navegar', () => {
    mockRoute.snapshot.queryParams = { page: '5' };
    const queryState = new ListQueryState(mockRoute, mockRouter);

    queryState.setSize(50);
    expect(queryState.pageSize()).toBe(50);
    expect(queryState.page()).toBe(1);
    expect(mockRouter.navigate).toHaveBeenCalled();

    queryState.destroy();
  });

  it('reset() debe restablecer paginación y filtros a valores iniciales', () => {
    mockRoute.snapshot.queryParams = { page: '4', search: 'termino' };
    const queryState = new ListQueryState(mockRoute, mockRouter);

    queryState.reset();
    expect(queryState.page()).toBe(1);
    expect(queryState.pageSize()).toBe(20);
    expect(queryState.filters()).toEqual({});
    expect(mockRouter.navigate).toHaveBeenCalled();

    queryState.destroy();
  });

  it('debe reaccionar a cambios externos en queryParams (navegación atrás/adelante)', () => {
    const queryState = new ListQueryState(mockRoute, mockRouter);
    expect(queryState.page()).toBe(1);

    // Simular evento popstate / botón atrás
    queryParamsSubject.next({ page: '7', search: 'externo' });

    expect(queryState.page()).toBe(7);
    expect(queryState.filters()).toEqual({ search: 'externo' });

    queryState.destroy();
  });
});
