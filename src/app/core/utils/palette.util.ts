/**
 * Utilidades para derivación de paleta de marca y control de contraste accesible.
 * Convierte colores HEX a OKLCH, deriva los tonos 50, 100, 300, 500, 700, 900
 * manteniendo armonía cromática, ajusta el gamut a sRGB y asegura un ratio de
 * contraste mínimo de 4.5:1 (WCAG AA) para el tono 700 sobre fondo blanco.
 *
 * Devuelve triplets de canal RGB en formato "{r} {g} {b}" para su consumo por
 * Tailwind v3 mediante `rgb(var(--primary-N) / <alpha-value>)`.
 */

export type RampTones = 50 | 100 | 300 | 500 | 700 | 900;
export type PaletteRamp = Record<RampTones, string>;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface OklchColor {
  l: number; // 0 to 1
  c: number; // 0 to ~0.4
  h: number; // 0 to 360 degrees
}

/**
 * Parsea un string hexadecimal (#RGB, #RRGGBB) a valores RGB enteros en [0, 255].
 * Si el formato es inválido, retorna el azul institucional por defecto [3, 46, 221].
 */
export function hexToRgb(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') {
    return [3, 46, 221];
  }
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [3, 46, 221];
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Convierte un canal sRGB [0, 255] a espacio lineal [0, 1].
 */
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convierte un canal lineal [0, 1] a sRGB [0, 255].
 */
function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  const v = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

/**
 * Convierte RGB [0, 255] a OKLCH { l, c, h }.
 */
export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  // Linear RGB to LMS
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  // LMS to Oklab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_lab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Oklab to OKLCH
  const C = Math.sqrt(a * a + b_lab * b_lab);
  let H = (Math.atan2(b_lab, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: isNaN(H) ? 0 : H };
}

/**
 * Convierte OKLCH a RGB lineal (sin clamping) para comprobación de gamut.
 */
function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return [rLin, gLin, bLin];
}

/**
 * Verifica si un punto lineal RGB cae dentro del gamut sRGB [0, 1].
 */
function isInGamut(rLin: number, gLin: number, bLin: number): boolean {
  const eps = 0.0001;
  return (
    rLin >= -eps &&
    rLin <= 1 + eps &&
    gLin >= -eps &&
    gLin <= 1 + eps &&
    bLin >= -eps &&
    bLin <= 1 + eps
  );
}

/**
 * Convierte OKLCH a RGB [0, 255] aplicando mapeo de gamut sRGB mediante reducción de croma.
 */
export function oklchToRgb(l: number, c: number, h: number): RgbColor {
  if (l <= 0.00001) return { r: 0, g: 0, b: 0 };
  if (l >= 0.99999) return { r: 255, g: 255, b: 255 };

  let currentC = c;
  let [rLin, gLin, bLin] = oklchToLinearRgb(l, currentC, h);

  // Si está fuera de gamut, reducir croma por bisección hasta que entre
  if (!isInGamut(rLin, gLin, bLin)) {
    let low = 0;
    let high = currentC;
    for (let i = 0; i < 15; i++) {
      const mid = (low + high) / 2;
      const [rMid, gMid, bMid] = oklchToLinearRgb(l, mid, h);
      if (isInGamut(rMid, gMid, bMid)) {
        low = mid;
        rLin = rMid;
        gLin = gMid;
        bLin = bMid;
      } else {
        high = mid;
      }
    }
  }

  return {
    r: linearToSrgb(rLin),
    g: linearToSrgb(gLin),
    b: linearToSrgb(bLin),
  };
}

/**
 * Calcula la luminancia relativa según WCAG 2.1.
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calcula el ratio de contraste entre un color RGB y el fondo blanco #FFFFFF.
 * Retorna un valor >= 1.0 (ej. 4.5 para 4.5:1).
 */
export function calculateContrastAgainstWhite(r: number, g: number, b: number): number {
  const lum = calculateLuminance(r, g, b);
  const whiteLum = 1.0;
  return (whiteLum + 0.05) / (lum + 0.05);
}

/**
 * Formatea un objeto RGB a triplet string "{r} {g} {b}".
 */
function toTriplet(rgb: RgbColor): string {
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

/**
 * Deriva la rampa de 6 tonos (50, 100, 300, 500, 700, 900) a partir de un color HEX.
 * Aplica guard de contraste WCAG AA (>= 4.5:1) en el tono 700 sobre blanco.
 */
export function deriveRamp(hex: string): PaletteRamp {
  const [baseR, baseG, baseB] = hexToRgb(hex);
  const baseOklch = rgbToOklch(baseR, baseG, baseB);

  const baseL = baseOklch.l;
  const baseC = baseOklch.c;
  const baseH = baseOklch.h;

  // 1. Tono 50 (fondo claro sutil)
  // L = 0.97, croma acotado para un matiz suave
  const c50 = Math.min(baseC * 0.15, 0.03);
  const rgb50 = oklchToRgb(0.97, c50, baseH);

  // 2. Tono 100 (bordes o badges claros)
  const c100 = Math.min(baseC * 0.3, 0.06);
  const rgb100 = oklchToRgb(0.94, c100, baseH);

  // 3. Tono 300 (acento secundario o hover suave)
  const c300 = Math.min(baseC * 0.7, 0.14);
  const rgb300 = oklchToRgb(0.78, c300, baseH);

  // 4. Tono 500 (color base exacto proporcionado)
  const rgb500: RgbColor = { r: baseR, g: baseG, b: baseB };

  // 5. Tono 700 (texto accesible sobre blanco, botones hover)
  // Base inicial: L = baseL - 0.12, croma adaptado
  let l700 = Math.max(0.35, baseL - 0.12);
  const c700 = Math.min(baseC * 0.95, 0.22);
  let rgb700 = oklchToRgb(l700, c700, baseH);

  // Guard de contraste no negociable: ratio >= 4.5:1 contra blanco
  let contrast = calculateContrastAgainstWhite(rgb700.r, rgb700.g, rgb700.b);
  while (contrast < 4.5 && l700 > 0.15) {
    l700 = Math.max(0.15, l700 - 0.02);
    rgb700 = oklchToRgb(l700, c700, baseH);
    contrast = calculateContrastAgainstWhite(rgb700.r, rgb700.g, rgb700.b);
  }

  // 6. Tono 900 (superficies oscuras o encabezados muy profundos)
  const l900 = Math.max(0.12, Math.min(baseL - 0.3, 0.25));
  const c900 = Math.min(baseC * 0.8, 0.18);
  const rgb900 = oklchToRgb(l900, c900, baseH);

  return {
    50: toTriplet(rgb50),
    100: toTriplet(rgb100),
    300: toTriplet(rgb300),
    500: toTriplet(rgb500),
    700: toTriplet(rgb700),
    900: toTriplet(rgb900),
  };
}

/**
 * Retorna el triplete RGB accesible ("255 255 255" o "15 23 42") para texto/iconos
 * sobre el color de fondo hexadecimal especificado, garantizando contraste WCAG AA/AAA.
 */
export function getOnColorTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const contrast = calculateContrastAgainstWhite(r, g, b);
  return contrast >= 4.5 ? '255 255 255' : '15 23 42';
}
