import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('jd_theme_preference');
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ThemeService,
      ],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem('jd_theme_preference');
    document.documentElement.classList.remove('dark');
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
    expect(service.theme()).toBeDefined();
  });

  it('debe alternar entre dark y light con toggleTheme()', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
  });

  it('debe persistir el tema en localStorage al invocar setTheme()', () => {
    service.setTheme('light');
    expect(localStorage.getItem('jd_theme_preference')).toBe('light');

    service.setTheme('dark');
    expect(localStorage.getItem('jd_theme_preference')).toBe('dark');
  });

  it('debe inicializar el tema guardado en localStorage', () => {
    localStorage.setItem('jd_theme_preference', 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
    const lightService = TestBed.inject(ThemeService);
    expect(lightService.theme()).toBe('light');
    expect(lightService.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('debe ejecutar toggleTheme() con animación utilizando runWithViewTransition', () => {
    if ('startViewTransition' in document) {
      spyOn<any>(document, 'startViewTransition').and.callFake((cb: () => void) => {
        cb();
        return {};
      });
    }
    service.setTheme('dark');
    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });
});

