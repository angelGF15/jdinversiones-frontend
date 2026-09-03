import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'jd_theme_preference';

  // --- Signals Reactivos de Estado ---
  private readonly _theme = signal<ThemeMode>('dark');

  public readonly theme = this._theme.asReadonly();
  public readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    this.initializeTheme();
  }

  /**
   * Inicializa el tema leyendo la preferencia guardada en localStorage
   * o detectando la preferencia del sistema operativo si no existe registro previo.
   */
  private initializeTheme(): void {
    if (!this.isBrowser) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') {
        this._theme.set(stored);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this._theme.set(prefersDark ? 'dark' : 'dark'); // Por defecto dark para estética Deep Navy
      }
      this.applyTheme(this._theme());
    } catch {
      this.applyTheme('dark');
    }
  }

  /**
   * Alterna entre modo claro y modo oscuro.
   */
  public toggleTheme(): void {
    const nextTheme: ThemeMode = this._theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  /**
   * Establece un tema específico ('light' o 'dark') y lo persiste.
   */
  public setTheme(mode: ThemeMode): void {
    this._theme.set(mode);

    if (this.isBrowser) {
      try {
        localStorage.setItem(this.STORAGE_KEY, mode);
      } catch {
        // Ignora errores si el almacenamiento está restringido
      }
      this.applyTheme(mode);
    }
  }

  /**
   * Aplica la clase .dark en la etiqueta raíz <html> para Tailwind CSS.
   */
  private applyTheme(mode: ThemeMode): void {
    if (!this.isBrowser) return;

    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
