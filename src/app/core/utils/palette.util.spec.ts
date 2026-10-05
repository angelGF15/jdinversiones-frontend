import { deriveRamp, PaletteRamp } from './palette.util';

describe('palette.util (deriveRamp)', () => {
  it('debe derivar los 6 tonos para el color institucional predeterminado (#032EDD)', () => {
    const ramp: PaletteRamp = deriveRamp('#032EDD');

    expect(ramp[50]).toBeDefined();
    expect(ramp[100]).toBeDefined();
    expect(ramp[300]).toBeDefined();
    expect(ramp[500]).toBeDefined();
    expect(ramp[700]).toBeDefined();
    expect(ramp[900]).toBeDefined();

    // Cada valor debe ser un triplete de canales separado por espacios: "R G B"
    const tripletRegex = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/;
    expect(ramp[50]).toMatch(tripletRegex);
    expect(ramp[100]).toMatch(tripletRegex);
    expect(ramp[300]).toMatch(tripletRegex);
    expect(ramp[500]).toMatch(tripletRegex);
    expect(ramp[700]).toMatch(tripletRegex);
    expect(ramp[900]).toMatch(tripletRegex);
  });

  it('debe soportar hex con o sin prefijo # y en mayúsculas/minúsculas', () => {
    const rampWithHash = deriveRamp('#032edd');
    const rampWithoutHash = deriveRamp('032EDD');

    expect(rampWithHash).toEqual(rampWithoutHash);
  });

  it('debe manejar colores límites sin lanzar excepción (#000000 y #FFFFFF)', () => {
    expect(() => deriveRamp('#000000')).not.toThrow();
    expect(() => deriveRamp('#FFFFFF')).not.toThrow();

    const rampBlack = deriveRamp('#000000');
    expect(rampBlack[50]).toBeDefined();
    expect(rampBlack[900]).toBeDefined();

    const rampWhite = deriveRamp('#FFFFFF');
    expect(rampWhite[50]).toBeDefined();
    expect(rampWhite[900]).toBeDefined();
  });

  it('debe clampear canales fuera de sRGB [0, 255] para colores saturados (#FF0000, #00FF00, #0000FF)', () => {
    const saturatedColors = ['#FF0000', '#00FF00', '#0000FF'];

    for (const hex of saturatedColors) {
      const ramp = deriveRamp(hex);
      for (const tone of [50, 100, 300, 500, 700, 900] as const) {
        const parts = ramp[tone].split(/\s+/).map(Number);
        expect(parts.length).toBe(3);
        parts.forEach((val) => {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(255);
        });
      }
    }
  });

  it('debe garantizar ratio de contraste WCAG AA (>= 4.5:1) en el tono 700 sobre fondo blanco (#FFFFFF)', () => {
    // Calculamos luminancia relativa para comprobar ratio
    function relativeLuminance(r: number, g: number, b: number): number {
      const srgb = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    const testHexes = ['#032EDD', '#F59E0B', '#10B981', '#EC4899', '#6366F1', '#E11D48'];

    for (const hex of testHexes) {
      const ramp = deriveRamp(hex);
      const [r, g, b] = ramp[700].split(/\s+/).map(Number);
      const lum700 = relativeLuminance(r, g, b);
      const lumWhite = 1.0;
      const contrast = (lumWhite + 0.05) / (lum700 + 0.05);

      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('debe recurrir al color por defecto si se ingresa un hex inválido', () => {
    const invalidRamp = deriveRamp('invalid-color');
    const defaultRamp = deriveRamp('#032EDD');

    expect(invalidRamp).toEqual(defaultRamp);
  });
});
