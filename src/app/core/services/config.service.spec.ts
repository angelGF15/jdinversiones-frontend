import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigService } from './config.service';
import { environment } from '../../../environments/environment';
import {
  Currency,
  NotificationRecipient,
  PublicBranding,
  Setting,
  SettingListResponse,
} from '../models/config.models';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/config`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfigService,
      ],
    });

    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Branding y Configuración General', () => {
    it('debe obtener el branding público (GET /config/public)', () => {
      const mockBranding: PublicBranding = {
        brand: {
          name: 'JD Inversiones',
          tagline: 'Centro Técnico',
          logoUrl: 'https://cdn.example.com/logo.webp',
          primaryColor: '#032EDD',
        },
        contact: {
          email: 'contacto@jdinversiones.com',
          phone: '+504 2233-4455',
          whatsapp: '+504 2233-4455',
        },
        social: {
          facebookUrl: 'https://facebook.com/jd',
          instagramUrl: 'https://instagram.com/jd',
        },
      };

      service.getPublicBranding().subscribe((res) => {
        expect(res).toEqual(mockBranding);
      });

      const req = httpMock.expectOne(`${baseUrl}/public`);
      expect(req.request.method).toBe('GET');
      req.flush(mockBranding);
    });

    it('debe obtener el catálogo de monedas (GET /config/currencies)', () => {
      const mockCurrencies: Currency[] = [
        { id: '1', code: 'HNL', name: 'Lempira', symbol: 'L', decimalPlaces: 2, isDefault: true },
        { id: '2', code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimalPlaces: 2, isDefault: false },
      ];

      service.getCurrencies().subscribe((res) => {
        expect(res).toEqual(mockCurrencies);
      });

      const req = httpMock.expectOne(`${baseUrl}/currencies`);
      expect(req.request.method).toBe('GET');
      req.flush({ currencies: mockCurrencies });
    });

    it('debe subir un archivo de logotipo institucional (POST /config/logo)', () => {
      const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });

      service.uploadLogo(file).subscribe((res) => {
        expect(res.logoUrl).toBe('https://cdn.example.com/new-logo.webp');
      });

      const req = httpMock.expectOne(`${baseUrl}/logo`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush({ logoUrl: 'https://cdn.example.com/new-logo.webp' });
    });

    it('debe restablecer el logotipo institucional (DELETE /config/logo)', () => {
      service.deleteLogo().subscribe((res) => {
        expect(res.logoUrl).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/logo`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ logoUrl: null });
    });

    it('debe obtener la lista de configuraciones con metadatos y grupos (GET /config)', () => {
      const mockResponse: SettingListResponse = {
        settings: [
          {
            key: 'company_name',
            value: 'JD Inversiones',
            description: 'Nombre',
            groupCode: 'empresa',
            sortOrder: 1,
            isRequired: true,
            isPublic: true,
            type: { code: 'text', name: 'Texto' },
            updatedAt: '2026-10-01T00:00:00Z',
          },
        ],
        groups: [
          {
            code: 'empresa',
            label: 'Empresa',
            description: 'Datos de la empresa',
            icon: 'storefront',
          },
        ],
      };

      service.getSettings().subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.groups?.length).toBe(1);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('debe actualizar múltiples configuraciones de forma atómica (PATCH /config)', () => {
      const items = [{ key: 'company_name', value: 'Nuevo Nombre' }];
      const mockResponse: SettingListResponse = {
        settings: [
          {
            key: 'company_name',
            value: 'Nuevo Nombre',
            description: 'Nombre',
            groupCode: 'empresa',
            sortOrder: 1,
            isRequired: true,
            isPublic: true,
            type: { code: 'text', name: 'Texto' },
            updatedAt: '2026-10-02T00:00:00Z',
          },
        ],
      };

      service.updateSettings(items).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ settings: items });
      req.flush(mockResponse);
    });
  });

  describe('Destinatarios de Notificación', () => {
    it('debe listar contactos de notificación con filtros (GET /config/notification-recipients)', () => {
      service.listRecipients({ isActive: true }).subscribe((res) => {
        expect(res.recipients.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/notification-recipients?isActive=true`);
      expect(req.request.method).toBe('GET');
      req.flush({
        recipients: [
          {
            id: '123',
            channel: 'email',
            contact: 'test@example.com',
            label: 'Test',
            type: 'alert',
            isActive: true,
            createdAt: '2026-10-01',
            updatedAt: '2026-10-01',
          },
        ],
      });
    });

    it('debe cambiar el estado activo de un destinatario (PATCH /config/notification-recipients/:id/status)', () => {
      service.setRecipientStatus('rec-123', false).subscribe((res) => {
        expect(res.isActive).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/notification-recipients/rec-123/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({
        id: 'rec-123',
        channel: 'email',
        contact: 'test@example.com',
        label: 'Test',
        type: 'alert',
        isActive: false,
        createdAt: '2026-10-01',
        updatedAt: '2026-10-02',
      });
    });
  });
});
