import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideZonelessChangeDetection, PLATFORM_ID, TransferState } from '@angular/core';
import { of, throwError } from 'rxjs';
import { BrandService } from './brand.service';
import { ConfigService } from './config.service';
import { PublicBranding } from '../models/config.models';

describe('BrandService', () => {
  let service: BrandService;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;
  let titleServiceSpy: jasmine.SpyObj<Title>;

  const mockBranding: PublicBranding = {
    brand: {
      name: 'Mi Empresa Custom',
      tagline: 'Soluciones Tecnológicas',
      logoUrl: 'https://cdn.example.com/logo.webp',
      primaryColor: '#10B981',
    },
    contact: {
      email: 'info@empresa.com',
      phone: '+504 9999-9999',
      whatsapp: '+504 9999-9999',
    },
    social: {
      facebookUrl: 'https://facebook.com/empresa',
      instagramUrl: 'https://instagram.com/empresa',
    },
  };

  beforeEach(() => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', ['getPublicBranding']);
    configServiceSpy.getPublicBranding.and.returnValue(of(mockBranding));

    titleServiceSpy = jasmine.createSpyObj('Title', ['setTitle']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BrandService,
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: Title, useValue: titleServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
        TransferState,
      ],
    });

    service = TestBed.inject(BrandService);
  });

  it('debe crearse con valores por defecto cuando no hay branding cargado', () => {
    expect(service).toBeTruthy();
    expect(service.companyName()).toBe('JDinversiones');
    expect(service.tagline()).toBe('Tienda y Centro Técnico');
    expect(service.logoUrl()).toBe('logo.svg');
    expect(service.primaryColor()).toBe('#032EDD');
  });

  it('debe cargar el branding público mediante load() y actualizar las señales computadas', (done) => {
    service.load().subscribe((result) => {
      expect(result).toEqual(mockBranding);
      expect(service.branding()).toEqual(mockBranding);
      expect(service.companyName()).toBe('Mi Empresa Custom');
      expect(service.tagline()).toBe('Soluciones Tecnológicas');
      expect(service.logoUrl()).toBe('https://cdn.example.com/logo.webp');
      expect(service.primaryColor()).toBe('#10B981');
      expect(service.contact()?.email).toBe('info@empresa.com');
      expect(service.social()?.facebookUrl).toBe('https://facebook.com/empresa');
      done();
    });
  });

  it('debe manejar errores de red en load() devolviendo null sin romper la aplicación', (done) => {
    configServiceSpy.getPublicBranding.and.returnValue(throwError(() => new Error('Network error')));

    service.load().subscribe((result) => {
      expect(result).toBeNull();
      // Debe conservar los fallbacks
      expect(service.companyName()).toBe('JDinversiones');
      done();
    });
  });

  it('debe aplicar el color primario en documentElement y localStorage al llamar applyPrimaryColor', () => {
    spyOn(localStorage, 'setItem');
    service.applyPrimaryColor('#F59E0B', true);

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--primary-500')).toBeTruthy();
    expect(localStorage.setItem).toHaveBeenCalledWith('jd_brand_primary', '#F59E0B');
  });

  it('debe refrescar branding con refresh()', (done) => {
    const updatedBranding: PublicBranding = {
      ...mockBranding,
      brand: { ...mockBranding.brand, name: 'Nombre Refrescado' },
    };
    configServiceSpy.getPublicBranding.and.returnValue(of(updatedBranding));

    service.refresh().subscribe((data) => {
      expect(data?.brand?.name).toBe('Nombre Refrescado');
      expect(service.companyName()).toBe('Nombre Refrescado');
      done();
    });
  });
});
