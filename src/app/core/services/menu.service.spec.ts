import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MenuService } from './menu.service';
import { environment } from '../../../environments/environment';
import { MenuResponse } from '../models/menu.models';

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        MenuService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse con estado inicial vacío', () => {
    expect(service).toBeTruthy();
    expect(service.menu()).toEqual([]);
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('debe cargar y ordenar el menú data-driven desde el backend', () => {
    const mockResponse: MenuResponse = {
      menu: [
        {
          id: '2',
          code: 'INVENTORY',
          name: 'Inventario',
          icon: 'Package',
          route: '/admin/inventory',
          order: 2,
          children: [
            {
              id: '2-2',
              code: 'CATEGORIES',
              name: 'Categorías',
              icon: 'Tag',
              route: '/admin/inventory/categories',
              order: 2,
              children: [],
            },
            {
              id: '2-1',
              code: 'PRODUCTS',
              name: 'Productos',
              icon: 'Box',
              route: '/admin/inventory/products',
              order: 1,
              children: [],
            },
          ],
        },
        {
          id: '1',
          code: 'DASHBOARD',
          name: 'Dashboard',
          icon: 'LayoutDashboard',
          route: '/admin/dashboard',
          order: 1,
          children: [],
        },
      ],
    };

    service.loadMenu().subscribe((items) => {
      expect(items.length).toBe(2);
      expect(items[0].code).toBe('DASHBOARD');
      expect(items[1].code).toBe('INVENTORY');
      // Verifica ordenamiento de hijos
      expect(items[1].children[0].code).toBe('PRODUCTS');
      expect(items[1].children[1].code).toBe('CATEGORIES');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/menu`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(service.menu().length).toBe(2);
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('debe manejar errores en la petición actualizando el signal error', () => {
    service.loadMenu().subscribe({
      next: () => fail('debió fallar'),
      error: () => {
        expect(service.error()).toBe('Error de red');
        expect(service.isLoading()).toBeFalse();
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/menu`);
    req.flush({ message: 'Error de red' }, { status: 500, statusText: 'Server Error' });
  });

  it('debe limpiar el estado con clearMenu()', () => {
    service.clearMenu();
    expect(service.menu()).toEqual([]);
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('debe mapear correctamente los nombres de iconos de Lucide a Material Icons', () => {
    expect(service.getMaterialIcon('LayoutDashboard')).toBe('dashboard');
    expect(service.getMaterialIcon('Package')).toBe('inventory_2');
    expect(service.getMaterialIcon('Box')).toBe('inventory');
    expect(service.getMaterialIcon('Settings')).toBe('settings');
    expect(service.getMaterialIcon('UserCog')).toBe('manage_accounts');
    expect(service.getMaterialIcon('Shield')).toBe('admin_panel_settings');
    expect(service.getMaterialIcon('Key')).toBe('vpn_key');
    expect(service.getMaterialIcon('Wrench')).toBe('build');
    expect(service.getMaterialIcon('NonExistentIcon')).toBe('folder');
    expect(service.getMaterialIcon('')).toBe('folder');
  });
});
