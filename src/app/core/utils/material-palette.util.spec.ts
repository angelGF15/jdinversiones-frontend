import {
  generateMaterialPalette,
  applyMaterialTokens,
} from './material-palette.util';

describe('material-palette.util', () => {
  afterEach(() => {
    const el = document.getElementById('mat-sys-dynamic-tokens');
    if (el) {
      el.remove();
    }
  });

  it('debe generar exactamente 49 tokens para modo claro y 49 para modo oscuro', () => {
    const palette = generateMaterialPalette('#032EDD');
    const lightKeys = Object.keys(palette.light);
    const darkKeys = Object.keys(palette.dark);

    expect(lightKeys.length).toBe(49);
    expect(darkKeys.length).toBe(49);
    expect(lightKeys).toEqual(darkKeys);
  });

  describe('Verificación de contraste en colores extremos (WCAG AA/AAA)', () => {
    it('para amarillo #FACC15, on-primary debe ser texto oscuro (#0f172a) para garantizar contraste accesible', () => {
      const palette = generateMaterialPalette('#FACC15');
      expect(palette.light['--mat-sys-on-primary']).toBe('#0f172a');
      expect(palette.light['--mat-sys-primary']).toBe('#facc15');
    });

    it('para azul profundo #1E3A8A, on-primary debe ser texto blanco (#ffffff)', () => {
      const palette = generateMaterialPalette('#1E3A8A');
      expect(palette.light['--mat-sys-on-primary']).toBe('#ffffff');
      expect(palette.light['--mat-sys-primary']).toBe('#1e3a8a');
    });

    it('para rojo intenso #DC2626, on-primary debe ser texto blanco (#ffffff)', () => {
      const palette = generateMaterialPalette('#DC2626');
      expect(palette.light['--mat-sys-on-primary']).toBe('#ffffff');
      expect(palette.light['--mat-sys-primary']).toBe('#dc2626');
    });
  });

  describe('Superficies en Modo Oscuro (Armonía con Slate)', () => {
    it('debe utilizar tonos slate oscuros y evitar negro puro en fondos y superficies', () => {
      const palette = generateMaterialPalette('#032EDD');
      expect(palette.dark['--mat-sys-background']).toBe('#0f172a');
      expect(palette.dark['--mat-sys-surface']).toBe('#0f172a');
      expect(palette.dark['--mat-sys-surface-variant']).toBe('#1e293b');
      expect(palette.dark['--mat-sys-surface-container']).toBe('#1e293b');
      expect(palette.dark['--mat-sys-surface-container-highest']).toBe('#334155');
      expect(palette.dark['--mat-sys-inverse-primary']).toBe('#032edd');
    });
  });

  describe('applyMaterialTokens', () => {
    it('debe inyectar la etiqueta style id="mat-sys-dynamic-tokens" en document.head', () => {
      applyMaterialTokens('#032EDD');
      const styleEl = document.getElementById('mat-sys-dynamic-tokens');
      expect(styleEl).toBeTruthy();
      expect(styleEl?.tagName.toLowerCase()).toBe('style');
      expect(styleEl?.textContent).toContain('html {');
      expect(styleEl?.textContent).toContain('html.dark {');
      expect(styleEl?.textContent).toContain('--mat-sys-primary: #032edd;');
    });

    it('debe actualizar la etiqueta style existente si se vuelve a invocar', () => {
      applyMaterialTokens('#032EDD');
      applyMaterialTokens('#DC2626');
      const styles = document.querySelectorAll('#mat-sys-dynamic-tokens');
      expect(styles.length).toBe(1);
      expect(styles[0].textContent).toContain('--mat-sys-primary: #dc2626;');
    });
  });
});
