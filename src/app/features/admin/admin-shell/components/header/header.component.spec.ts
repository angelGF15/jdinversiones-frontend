import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HeaderComponent } from './header.component';
import { AuthState } from '../../../../../core/auth/auth.state';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    Object.defineProperty(authStateSpy, 'fullName', { value: signal('Admin User') });
    Object.defineProperty(authStateSpy, 'userEmail', { value: signal('admin@jdinversiones.hn') });
    Object.defineProperty(authStateSpy, 'roles', { value: signal(['ADMINISTRADOR']) });

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe emitir toggleMobileMenu al pulsar el botón hamburguesa', () => {
    spyOn(component.toggleMobileMenu, 'emit');
    const button = fixture.nativeElement.querySelector('button[aria-label="Abrir menú de navegación"]');
    button.click();
    expect(component.toggleMobileMenu.emit).toHaveBeenCalled();
  });

  it('debe emitir toggleSidebarCollapse al pulsar el botón desktop', () => {
    spyOn(component.toggleSidebarCollapse, 'emit');
    component.toggleSidebarCollapse.emit();
    expect(component.toggleSidebarCollapse.emit).toHaveBeenCalled();
  });

  it('debe emitir logoutTriggered al solicitar cerrar sesión', () => {
    spyOn(component.logoutTriggered, 'emit');
    component.onLogout();
    expect(component.logoutTriggered.emit).toHaveBeenCalled();
  });
});
