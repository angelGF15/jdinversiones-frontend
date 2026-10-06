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
import { PublicBranding, Brand } from '../models/config.models';
import { deriveRamp, getOnColorTriplet } from '../utils/palette.util';
import { runWithViewTransition } from '../utils/view-transition.util';
import { applyMaterialTokens } from '../utils/material-palette.util';

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
  public readonly logoVersion = signal<number>(Date.now());

  public readonly brand = computed(() => this.branding()?.brand ?? null);
  public readonly companyName = computed(() => this.branding()?.brand?.name ?? 'JDinversiones');
  public readonly tagline = computed(
    () => this.branding()?.brand?.tagline ?? 'Tienda y Centro Técnico'
  );
  public readonly logoUrl = computed(() => {
    const raw = this.branding()?.brand?.logoUrl;
    if (!raw || raw === 'logo.svg') return 'logo.svg';
    if (raw.startsWith('data:')) return raw;
    const base = raw.split('?')[0];
    return `${base}?v=${this.logoVersion()}`;
  });
  public readonly hasCustomLogo = computed(() => {
    const raw = this.branding()?.brand?.logoUrl;
    return !!raw && raw !== 'logo.svg';
  });
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

    // Efecto reactivo para mantener actualizado el <title> y <link rel="icon"> del documento
    effect(() => {
      const name = this.companyName();
      const tag = this.tagline();
      const logo = this.logoUrl();
      const primary = this.primaryColor();

      if (this.isBrowser) {
        this.titleService.setTitle(`${name} - ${tag}`);
        this.updateFavicon(name, logo, primary);
      }
    });
  }

  /**
   * Actualiza el favicon dinámicamente con el logo corporativo o un monograma vectorial SVG.
   */
  private updateFavicon(name: string, currentLogoUrl: string, primaryHex: string): void {
    if (!this.isBrowser) return;

    let iconHref = currentLogoUrl;
    const hasCustomLogo =
      !!this.branding()?.brand?.logoUrl && this.branding()?.brand?.logoUrl !== 'logo.svg';

    if (!hasCustomLogo) {
      const cleanName = (name || 'JD').trim();
      const words = cleanName.split(/\s+/).filter(Boolean);
      const monogram =
        words.length >= 2
          ? `${words[0][0]}${words[1][0]}`.toUpperCase()
          : cleanName.slice(0, 2).toUpperCase();

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${primaryHex}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="28">${monogram}</text></svg>`;
      iconHref = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    const links = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
    if (links.length > 0) {
      links.forEach((link) => {
        link.href = iconHref;
        if (!hasCustomLogo) {
          link.type = 'image/svg+xml';
        }
      });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = iconHref;
      if (!hasCustomLogo) {
        link.type = 'image/svg+xml';
      }
      document.head.appendChild(link);
    }
  }

  /**
   * Sobrescribe de forma optimista e inmediata campos de branding en memoria
   * sin requerir peticiones de red al servidor.
   */
  public patchBrandLocally(partial: {
    name?: string;
    tagline?: string;
    logoUrl?: string | null;
    primaryColor?: string;
  }): void {
    const current = this.branding();
    const updatedBrand: Brand = {
      name: partial.name !== undefined ? partial.name : (current?.brand?.name ?? 'JDinversiones'),
      tagline:
        partial.tagline !== undefined
          ? partial.tagline
          : (current?.brand?.tagline ?? 'Tienda y Centro Técnico'),
      logoUrl: partial.logoUrl !== undefined ? partial.logoUrl : (current?.brand?.logoUrl ?? null),
      primaryColor:
        partial.primaryColor !== undefined
          ? partial.primaryColor
          : (current?.brand?.primaryColor ?? DEFAULT_PRIMARY_COLOR),
    };

    if (partial.logoUrl !== undefined) {
      this.logoVersion.set(Date.now());
    }

    const nextBranding: PublicBranding = {
      brand: updatedBrand,
      contact: current?.contact ?? { email: null, phone: null, whatsapp: null },
      social: current?.social ?? { facebookUrl: null, instagramUrl: null },
    };

    this.branding.set(nextBranding);

    if (partial.primaryColor) {
      this.applyPrimaryColor(partial.primaryColor, true, true);
    }
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
    this.logoVersion.set(Date.now());
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
   * Ejecuta una actualización visual suave mediante View Transitions API si está soportada
   * y el usuario no tiene habilitada la preferencia de movimiento reducido.
   */
  private morph(apply: () => void): void {
    runWithViewTransition(apply);
  }

  /**
   * Aplica un color hexadecimal derivando su rampa tonal completa mediante OKLCH,
   * inyectando las variables CSS --primary-* y persistiendo en localStorage.
   * Opcionalmente ejecuta una animación fluida con View Transitions API.
   */
  public applyPrimaryColor(hex: string, persist = true, animate = false): void {
    const apply = () => {
      const ramp = deriveRamp(hex);

      if (this.isBrowser) {
        const root = document.documentElement;
        root.style.setProperty('--primary-50', ramp[50]);
        root.style.setProperty('--primary-100', ramp[100]);
        root.style.setProperty('--primary-300', ramp[300]);
        root.style.setProperty('--primary-500', ramp[500]);
        root.style.setProperty('--primary-700', ramp[700]);
        root.style.setProperty('--primary-900', ramp[900]);
        root.style.setProperty('--on-primary', getOnColorTriplet(hex));
        applyMaterialTokens(hex);

        if (persist) {
          try {
            localStorage.setItem(COLOR_STORAGE_KEY, hex);
          } catch {
            // Ignorar si el almacenamiento está restringido
          }
        }
      }
    };

    if (animate && this.isBrowser) {
      this.morph(apply);
    } else {
      apply();
    }
  }
}
