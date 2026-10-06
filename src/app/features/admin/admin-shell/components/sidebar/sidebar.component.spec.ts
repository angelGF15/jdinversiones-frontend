import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { AuthState } from '../../../../../core/auth/auth.state';
import { MenuService } from '../../../../../core/services/menu.service';
import { MenuItem } from '../../../../../core/models/menu.models';

import { BrandService } from '../../../../../core/services/brand.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let menuServiceSpy: jasmine.SpyObj<MenuService>;

  const mockBrandService = {
    brand: signal(null),
    logoUrl: signal('logo.svg'),
    hasCustomLogo: signal(false),
    companyName: signal('JD Inversiones'),
    tagline: signal('Tienda y Centro Técnico'),
    primaryColor: signal('#032EDD'),
  };

  const mockMenu: MenuItem[] = [
    {
      id: '01',
      code: 'DASHBOARD',
      name: 'Dashboard',
      icon: 'LayoutDashboard',
      route: '/admin/dashboard',
      order: 1,
      children: [],
    },
    {
      id: '02',
      code: 'INVENTORY',
      name: 'Inventario',
      icon: 'Package',
      route: '/admin/inventory',
      order: 2,
      children: [
        {
          id: '02-1',
          code: 'PRODUCTS',
          name: 'Productos',
          icon: 'Box',
          route: '/admin/inventory/products',
          order: 1,
          children: [],
        },
      ],
    },
  ];

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', [
      'hasPermission',
      'hasAnyPermission',
    ]);
    Object.defineProperty(authStateSpy, 'fullName', { value: signal('Admin User') });
    Object.defineProperty(authStateSpy, 'avatarUrl', { value: signal(null) });
    Object.defineProperty(authStateSpy, 'roles', { value: signal(['ADMINISTRADOR']) });
    Object.defineProperty(authStateSpy, 'permissions', {
      value: signal(['DASHBOARD_VIEW', 'PRODUCT_VIEW']),
    });
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    menuServiceSpy = jasmine.createSpyObj('MenuService', [
      'loadMenu',
      'clearMenu',
      'getMaterialIcon',
    ]);
    menuServiceSpy.loadMenu.and.returnValue(of(mockMenu));
    menuServiceSpy.getMaterialIcon.and.callFake((name: string) => {
      if (name === 'LayoutDashboard') return 'dashboard';
      if (name === 'Package') return 'inventory_2';
      if (name === 'Box') return 'inventory';
      return 'folder';
    });
    Object.defineProperty(menuServiceSpy, 'menu', { value: signal(mockMenu) });
    Object.defineProperty(menuServiceSpy, 'isLoading', { value: signal(false) });
    Object.defineProperty(menuServiceSpy, 'error', { value: signal(null) });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthState, useValue: authStateSpy },
        { provide: MenuService, useValue: menuServiceSpy },
        { provide: BrandService, useValue: mockBrandService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y cargar el menú dinámico', () => {
    expect(component).toBeTruthy();
    expect(menuServiceSpy.loadMenu).toHaveBeenCalled();
  });

  it('debe alternar la expansión de un grupo colapsable al ejecutar toggleGroup', () => {
    const inventoryGroup = mockMenu[1];
    expect(component.isGroupExpanded(inventoryGroup.id)).toBeFalse();

    component.toggleGroup(inventoryGroup);
    expect(component.isGroupExpanded(inventoryGroup.id)).toBeTrue();

    component.toggleGroup(inventoryGroup);
    expect(component.isGroupExpanded(inventoryGroup.id)).toBeFalse();
  });

  it('debe solicitar expandir el sidebar si toggleGroup se invoca en modo colapsado', () => {
    component.isCollapsed = true;
    spyOn(component.expandSidebar, 'emit');

    const inventoryGroup = mockMenu[1];
    component.toggleGroup(inventoryGroup);

    expect(component.expandSidebar.emit).toHaveBeenCalled();
    expect(component.isGroupExpanded(inventoryGroup.id)).toBeTrue();
  });

  it('debe mapear correctamente iconos de Lucide a Material Icons', () => {
    expect(component.getIcon('LayoutDashboard')).toBe('dashboard');
    expect(component.getIcon('Package')).toBe('inventory_2');
    expect(component.getIcon('Box')).toBe('inventory');
  });

  it('debe emitir closeMobile al hacer click en un item de navegación', () => {
    spyOn(component.closeMobile, 'emit');
    component.onNavItemClick();
    expect(component.closeMobile.emit).toHaveBeenCalled();
  });

  it('debe emitir logoutTriggered al solicitar cerrar sesión', () => {
    spyOn(component.logoutTriggered, 'emit');
    component.onLogout();
    expect(component.logoutTriggered.emit).toHaveBeenCalled();
  });

  it('debe identificar un grupo como activo cuando la ruta coincide con uno de sus hijos (isGroupActive)', () => {
    const inventoryGroup = mockMenu[1];
    // Cuando la URL no coincide
    expect(component.isGroupActive(inventoryGroup)).toBeFalse();

    // Simular que el signal currentUrl apunta a la subruta
    Object.defineProperty(component, 'currentUrl', {
      value: () => '/admin/inventory/products',
    });

    expect(component.isGroupActive(inventoryGroup)).toBeTrue();
  });

  it('debe auto-expandir el grupo padre activo', () => {
    const inventoryGroup = mockMenu[1];
    spyOn(component, 'isGroupActive').and.callFake((item) => item.id === inventoryGroup.id);

    (component as any).autoExpandActiveGroups();
    expect(component.isGroupExpanded(inventoryGroup.id)).toBeTrue();
  });

  it('debe computar el monograma a partir de las iniciales del nombre de empresa', () => {
    expect(component.monogram()).toBe('JI'); // "JD Inversiones" -> "JI"
  });

  it('debe computar monograma de una sola palabra tomando las primeras 2 letras', () => {
    mockBrandService.companyName.set('JDinversiones');
    expect(component.monogram()).toBe('JD');
    mockBrandService.companyName.set('JD Inversiones');
  });
});
