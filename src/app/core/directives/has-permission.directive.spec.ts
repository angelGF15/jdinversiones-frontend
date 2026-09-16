import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthState } from '../auth/auth.state';

@Component({
  template: `
    <button id="single-allowed" *hasPermission="'PRODUCT_VIEW'">Ver Producto</button>
    <button id="single-denied" *hasPermission="'USER_DELETE'">Eliminar Usuario</button>
    <button id="array-allowed" *hasPermission="['REPORT_VIEW', 'PRODUCT_CREATE']">Crear o Ver</button>
    <button id="array-denied" *hasPermission="['SETTINGS_EDIT', 'SYSTEM_RESET']">Configurar</button>
  `,
  imports: [HasPermissionDirective],
  standalone: true,
})
class TestHostComponent {}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);

    authStateSpy.hasPermission.and.callFake((perm: string) => perm === 'PRODUCT_VIEW');
    authStateSpy.hasAnyPermission.and.callFake((perms: string[]) =>
      perms.includes('PRODUCT_CREATE') || perms.includes('PRODUCT_VIEW')
    );

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('debe renderizar el elemento si el usuario tiene el permiso individual', () => {
    const btn = fixture.debugElement.query(By.css('#single-allowed'));
    expect(btn).toBeTruthy();
    expect(btn.nativeElement.textContent).toBe('Ver Producto');
  });

  it('no debe renderizar el elemento si el usuario no tiene el permiso individual', () => {
    const btn = fixture.debugElement.query(By.css('#single-denied'));
    expect(btn).toBeNull();
  });

  it('debe renderizar el elemento si el usuario tiene al menos un permiso del arreglo', () => {
    const btn = fixture.debugElement.query(By.css('#array-allowed'));
    expect(btn).toBeTruthy();
    expect(btn.nativeElement.textContent).toBe('Crear o Ver');
  });

  it('no debe renderizar el elemento si el usuario no tiene ninguno de los permisos del arreglo', () => {
    const btn = fixture.debugElement.query(By.css('#array-denied'));
    expect(btn).toBeNull();
  });
});
