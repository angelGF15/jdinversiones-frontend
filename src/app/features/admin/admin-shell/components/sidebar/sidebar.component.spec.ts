import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthState } from '../../../../../core/auth/auth.state';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', [
      'hasPermission',
      'hasAnyPermission',
    ]);
    Object.defineProperty(authStateSpy, 'fullName', { value: signal('Admin User') });
    Object.defineProperty(authStateSpy, 'roles', { value: signal(['ADMINISTRADOR']) });
    Object.defineProperty(authStateSpy, 'permissions', {
      value: signal(['DASHBOARD_VIEW', 'PRODUCT_VIEW']),
    });
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con 7 módulos de navegación configurados', () => {
    expect(component).toBeTruthy();
    expect(component.navItems.length).toBe(7);
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
});
