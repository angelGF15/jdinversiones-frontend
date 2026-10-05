import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { PublicBranding } from '../models/config.models';
import { deriveRamp } from '../utils/palette.util';

const BRANDING_TRANSFER_KEY = makeStateKey<PublicBranding>('jd_brand_state');
const COLOR_STORAGE_KEY = 'jd_brand_primary';
const DEFAULT_PRIMARY_COLOR = '#032EDD';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly configService = inject(ConfigService);
  private readonly transferState = inject(TransferState);
  private readonly titleService = inject(Title);

  // --- Signals de Estado de Marca ---
  public readonly branding = signal<PublicBranding | null>(null);

  public readonly brand = computed(() => this.branding()?.brand ?? null);
  public readonly companyName = computed(() => this.branding()?.brand?.name ?? 'JDinversiones');
  public readonly tagline = computed(
    () => this.branding()?.brand?.tagline ?? 'Tienda y Centro Técnico'
  );
  public readonly logoUrl = computed(() => this.branding()?.brand?.logoUrl || 'logo.svg');
  public readonly primaryColor = computed(
    () => this.branding()?.brand?.primaryColor ?? DEFAULT_PRIMARY_COLOR
  );
  public readonly contact = computed(() => this.branding()?.contact ?? null);
  public readonly social = computed(() => this.branding()?.social ?? null);

  constructor() {
    // Sincronización instantánea de color antes del primer paint para evitar flash
    if (this.isBrowser) {
      this.initColorFromStorage();
    }

    // Efecto reactivo para mantener actualizado el <title> del documento
    effect(() => {
      const name = this.companyName();
      const tag = this.tagline();
      if (this.isBrowser) {
        this.titleService.setTitle(`${name} - ${tag}`);
      }
    });
  }

  /**
   * Carga inicial del branding institucional.
   * Utiliza TransferState para evitar peticiones duplicadas entre SSR e hidratación en navegador.
   */
  public load(): Observable<PublicBranding | null> {
    if (this.isBrowser && this.transferState.hasKey(BRANDING_TRANSFER_KEY)) {
      const cached = this.transferState.get(BRANDING_TRANSFER_KEY, null);
      this.transferState.remove(BRANDING_TRANSFER_KEY);
      if (cached) {
        this.applyBranding(cached);
        return of(cached);
      }
    }

    return this.configService.getPublicBranding().pipe(
      tap((data) => {
        if (!this.isBrowser) {
          this.transferState.set(BRANDING_TRANSFER_KEY, data);
        }
        this.applyBranding(data);
      }),
      catchError((err) => {
        // En caso de caída de backend o timeout, preserva los valores por defecto locales sin romper la UI
        return of(null);
      })
    );
  }

  /**
   * Recarga los datos de branding desde el servidor para reflejar cambios en tiempo real
   * (por ejemplo tras subir un nuevo logo o cambiar el color de marca).
   */
  public refresh(): Observable<PublicBranding | null> {
    return this.configService.getPublicBranding().pipe(
      tap((data) => {
        this.applyBranding(data);
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Actualiza el estado reactivo con los datos de branding y propaga el color primario.
   */
  private applyBranding(data: PublicBranding): void {
    this.branding.set(data);
    if (data.brand?.primaryColor) {
      this.applyPrimaryColor(data.brand.primaryColor, true);
    }
  }

  /**
   * Inicializa síncronamente el color primario desde localStorage si existe.
   */
  private initColorFromStorage(): void {
    try {
      const stored = localStorage.getItem(COLOR_STORAGE_KEY);
      const color = stored && /^#[0-9a-fA-F]{6}$/.test(stored) ? stored : DEFAULT_PRIMARY_COLOR;
      this.applyPrimaryColor(color, false);
    } catch {
      this.applyPrimaryColor(DEFAULT_PRIMARY_COLOR, false);
    }
  }

  /**
   * Aplica un color hexadecimal derivando su rampa tonal completa mediante OKLCH,
   * inyectando las variables CSS --primary-* y persistiendo en localStorage.
   */
  public applyPrimaryColor(hex: string, persist = true): void {
    const ramp = deriveRamp(hex);

    if (this.isBrowser) {
      const root = document.documentElement;
      root.style.setProperty('--primary-50', ramp[50]);
      root.style.setProperty('--primary-100', ramp[100]);
      root.style.setProperty('--primary-300', ramp[300]);
      root.style.setProperty('--primary-500', ramp[500]);
      root.style.setProperty('--primary-700', ramp[700]);
      root.style.setProperty('--primary-900', ramp[900]);

      if (persist) {
        try {
          localStorage.setItem(COLOR_STORAGE_KEY, hex);
        } catch {
          // Ignorar si el almacenamiento está restringido
        }
      }
    }
  }
}
