import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        LoadingService,
        { provide: Router, useValue: { events: of() } },
      ],
    });
    service = TestBed.inject(LoadingService);
  });

  it('debe inicializarse con isLoading en false y variante full', () => {
    expect(service.isLoading()).toBeFalse();
    expect(service.variant()).toBe('full');
    expect(service.message()).toBeNull();
  });

  it('debe activar el estado de carga y actualizar variante y mensaje al invocar show()', () => {
    service.show('login', 'Autenticando...');
    expect(service.isLoading()).toBeTrue();
    expect(service.variant()).toBe('login');
    expect(service.message()).toBe('Autenticando...');
  });

  it('debe desactivar el estado de carga al invocar hide()', () => {
    service.show('admin');
    expect(service.isLoading()).toBeTrue();

    service.hide();
    expect(service.isLoading()).toBeFalse();
    expect(service.message()).toBeNull();
  });

  it('debe manejar múltiples solicitudes concurrentes con show() y hide()', () => {
    service.show('full');
    service.show('full');
    expect(service.isLoading()).toBeTrue();

    service.hide();
    // Aún queda una solicitud activa
    expect(service.isLoading()).toBeTrue();

    service.hide();
    // Ambas finalizadas
    expect(service.isLoading()).toBeFalse();
  });

  it('debe forzar el reinicio del estado con hide(true)', () => {
    service.show('full');
    service.show('full');
    expect(service.isLoading()).toBeTrue();

    service.hide(true);
    expect(service.isLoading()).toBeFalse();
  });

  it('debe envolver observables con withLoading() y ocultar al completar', () => {
    const testObs$ = of('resultado');
    let emittedValue = '';

    service.withLoading(testObs$, 'admin').subscribe((val) => {
      emittedValue = val;
    });

    expect(emittedValue).toBe('resultado');
    expect(service.isLoading()).toBeFalse();
  });
});
