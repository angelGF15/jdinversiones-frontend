import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { runWithViewTransition } from '../utils/view-transition.util';

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
        this._theme.set(prefersDark ? 'dark' : 'light');
      }
      this.applyTheme(this._theme());

      // Sincronizar automáticamente con el sistema operativo mientras no haya preferencia manual guardada
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        try {
          const userChoice = localStorage.getItem(this.STORAGE_KEY);
          if (!userChoice) {
            const nextMode: ThemeMode = e.matches ? 'dark' : 'light';
            this._theme.set(nextMode);
            this.applyTheme(nextMode);
          }
        } catch {
          // Ignorar si el almacenamiento está restringido
        }
      });
    } catch {
      this.applyTheme('dark');
    }
  }

  /**
   * Alterna entre modo claro y modo oscuro con animación fluida de transición.
   */
  public toggleTheme(): void {
    const nextTheme: ThemeMode = this._theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme, true);
  }

  /**
   * Establece un tema específico ('light' o 'dark'), lo persiste y opcionalmente
   * anima la transición visual con View Transitions API.
   */
  public setTheme(mode: ThemeMode, animate = false): void {
    this._theme.set(mode);

    if (this.isBrowser) {
      try {
        localStorage.setItem(this.STORAGE_KEY, mode);
      } catch {
        // Ignora errores si el almacenamiento está restringido
      }
      this.applyTheme(mode, animate);
    }
  }

  /**
   * Aplica la clase .dark en la etiqueta raíz <html> para Tailwind CSS.
   */
  private applyTheme(mode: ThemeMode, animate = false): void {
    if (!this.isBrowser) return;

    const apply = () => {
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (animate) {
      runWithViewTransition(apply);
    } else {
      apply();
    }
  }
}

