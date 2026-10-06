import {
  hexToRgb,
  rgbToOklch,
  oklchToRgb,
  calculateContrastAgainstWhite,
} from './palette.util';

export interface MaterialPaletteResult {
  light: Record<string, string>;
  dark: Record<string, string>;
}

function toHex(r: number, g: number, b: number): string {
  const pad = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

function toneHex(l: number, c: number, h: number): string {
  const rgb = oklchToRgb(l, c, h);
  return toHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Deriva los 49 tokens de color del sistema Material 3 (M3) tanto para modo claro
 * como para modo oscuro a partir del color de marca institucional, alineando
 * las superficies con la escala slate de la aplicación y garantizando contraste WCAG.
 */
export function generateMaterialPalette(hex: string): MaterialPaletteResult {
  const [baseR, baseG, baseB] = hexToRgb(hex);
  const baseOklch = rgbToOklch(baseR, baseG, baseB);
  const H = baseOklch.h;
  const C = baseOklch.c;

  // Contraste accesible para on-primary en modo claro
  const contrastVsWhite = calculateContrastAgainstWhite(baseR, baseG, baseB);
  const onPrimaryLight = contrastVsWhite >= 4.5 ? '#ffffff' : '#0f172a';

  // --- Modo Claro ---
  const light: Record<string, string> = {
    // Primario (9 tokens)
    '--mat-sys-primary': toHex(baseR, baseG, baseB),
    '--mat-sys-on-primary': onPrimaryLight,
    '--mat-sys-primary-container': toneHex(0.92, Math.min(C * 0.35, 0.08), H),
    '--mat-sys-on-primary-container': toneHex(0.20, Math.min(C * 0.9, 0.20), H),
    '--mat-sys-primary-fixed': toneHex(0.92, Math.min(C * 0.35, 0.08), H),
    '--mat-sys-primary-fixed-dim': toneHex(0.82, Math.min(C * 0.5, 0.12), H),
    '--mat-sys-on-primary-fixed': toneHex(0.18, Math.min(C * 0.9, 0.20), H),
    '--mat-sys-on-primary-fixed-variant': toneHex(0.32, Math.min(C * 0.8, 0.18), H),
    '--mat-sys-inverse-primary': toneHex(0.80, Math.min(C * 0.65, 0.15), H),

    // Secundario (8 tokens)
    '--mat-sys-secondary': toneHex(0.42, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-on-secondary': '#ffffff',
    '--mat-sys-secondary-container': toneHex(0.92, Math.min(C * 0.15, 0.04), H),
    '--mat-sys-on-secondary-container': toneHex(0.22, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-secondary-fixed': toneHex(0.92, Math.min(C * 0.15, 0.04), H),
    '--mat-sys-secondary-fixed-dim': toneHex(0.82, Math.min(C * 0.25, 0.05), H),
    '--mat-sys-on-secondary-fixed': toneHex(0.18, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-on-secondary-fixed-variant': toneHex(0.32, Math.min(C * 0.3, 0.06), H),

    // Terciario (8 tokens)
    '--mat-sys-tertiary': toneHex(0.45, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-on-tertiary': '#ffffff',
    '--mat-sys-tertiary-container': toneHex(0.92, Math.min(C * 0.25, 0.06), (H + 60) % 360),
    '--mat-sys-on-tertiary-container': toneHex(0.20, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-tertiary-fixed': toneHex(0.92, Math.min(C * 0.25, 0.06), (H + 60) % 360),
    '--mat-sys-tertiary-fixed-dim': toneHex(0.82, Math.min(C * 0.35, 0.08), (H + 60) % 360),
    '--mat-sys-on-tertiary-fixed': toneHex(0.18, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-on-tertiary-fixed-variant': toneHex(0.32, Math.min(C * 0.45, 0.10), (H + 60) % 360),

    // Error (4 tokens)
    '--mat-sys-error': '#ba1a1a',
    '--mat-sys-on-error': '#ffffff',
    '--mat-sys-error-container': '#ffdad6',
    '--mat-sys-on-error-container': '#410002',

    // Fondo y Superficies (16 tokens)
    '--mat-sys-background': '#f8fafc',
    '--mat-sys-on-background': '#0f172a',
    '--mat-sys-surface': '#ffffff',
    '--mat-sys-on-surface': '#0f172a',
    '--mat-sys-surface-variant': '#f1f5f9',
    '--mat-sys-on-surface-variant': '#64748b',
    '--mat-sys-surface-tint': toHex(baseR, baseG, baseB),
    '--mat-sys-inverse-surface': '#0f172a',
    '--mat-sys-inverse-on-surface': '#f8fafc',
    '--mat-sys-surface-dim': '#e2e8f0',
    '--mat-sys-surface-bright': '#ffffff',
    '--mat-sys-surface-container-lowest': '#ffffff',
    '--mat-sys-surface-container-low': '#f8fafc',
    '--mat-sys-surface-container': '#f1f5f9',
    '--mat-sys-surface-container-high': '#e2e8f0',
    '--mat-sys-surface-container-highest': '#cbd5e1',

    // Contorno y Sombra (4 tokens)
    '--mat-sys-outline': '#94a3b8',
    '--mat-sys-outline-variant': '#e2e8f0',
    '--mat-sys-shadow': '#000000',
    '--mat-sys-scrim': '#000000',
  };

  // --- Modo Oscuro ---
  const primaryDark = toneHex(0.78, Math.min(C * 0.65, 0.16), H);
  const dark: Record<string, string> = {
    // Primario (9 tokens)
    '--mat-sys-primary': primaryDark,
    '--mat-sys-on-primary': toneHex(0.15, Math.min(C * 0.9, 0.22), H),
    '--mat-sys-primary-container': toneHex(0.30, Math.min(C * 0.85, 0.18), H),
    '--mat-sys-on-primary-container': toneHex(0.92, Math.min(C * 0.3, 0.07), H),
    '--mat-sys-primary-fixed': toneHex(0.92, Math.min(C * 0.35, 0.08), H),
    '--mat-sys-primary-fixed-dim': toneHex(0.82, Math.min(C * 0.5, 0.12), H),
    '--mat-sys-on-primary-fixed': toneHex(0.18, Math.min(C * 0.9, 0.20), H),
    '--mat-sys-on-primary-fixed-variant': toneHex(0.32, Math.min(C * 0.8, 0.18), H),
    '--mat-sys-inverse-primary': toHex(baseR, baseG, baseB),

    // Secundario (8 tokens)
    '--mat-sys-secondary': toneHex(0.78, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-on-secondary': toneHex(0.18, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-secondary-container': toneHex(0.32, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-on-secondary-container': toneHex(0.92, Math.min(C * 0.15, 0.04), H),
    '--mat-sys-secondary-fixed': toneHex(0.92, Math.min(C * 0.15, 0.04), H),
    '--mat-sys-secondary-fixed-dim': toneHex(0.82, Math.min(C * 0.25, 0.05), H),
    '--mat-sys-on-secondary-fixed': toneHex(0.18, Math.min(C * 0.3, 0.06), H),
    '--mat-sys-on-secondary-fixed-variant': toneHex(0.32, Math.min(C * 0.3, 0.06), H),

    // Terciario (8 tokens)
    '--mat-sys-tertiary': toneHex(0.80, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-on-tertiary': toneHex(0.18, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-tertiary-container': toneHex(0.32, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-on-tertiary-container': toneHex(0.92, Math.min(C * 0.25, 0.06), (H + 60) % 360),
    '--mat-sys-tertiary-fixed': toneHex(0.92, Math.min(C * 0.25, 0.06), (H + 60) % 360),
    '--mat-sys-tertiary-fixed-dim': toneHex(0.82, Math.min(C * 0.35, 0.08), (H + 60) % 360),
    '--mat-sys-on-tertiary-fixed': toneHex(0.18, Math.min(C * 0.45, 0.10), (H + 60) % 360),
    '--mat-sys-on-tertiary-fixed-variant': toneHex(0.32, Math.min(C * 0.45, 0.10), (H + 60) % 360),

    // Error (4 tokens)
    '--mat-sys-error': '#ffb4ab',
    '--mat-sys-on-error': '#690005',
    '--mat-sys-error-container': '#93000a',
    '--mat-sys-on-error-container': '#ffdad6',

    // Fondo y Superficies (16 tokens)
    '--mat-sys-background': '#0f172a',
    '--mat-sys-on-background': '#f8fafc',
    '--mat-sys-surface': '#0f172a',
    '--mat-sys-on-surface': '#f1f5f9',
    '--mat-sys-surface-variant': '#1e293b',
    '--mat-sys-on-surface-variant': '#94a3b8',
    '--mat-sys-surface-tint': primaryDark,
    '--mat-sys-inverse-surface': '#f8fafc',
    '--mat-sys-inverse-on-surface': '#0f172a',
    '--mat-sys-surface-dim': '#0b1120',
    '--mat-sys-surface-bright': '#1e293b',
    '--mat-sys-surface-container-lowest': '#090e17',
    '--mat-sys-surface-container-low': '#0f172a',
    '--mat-sys-surface-container': '#1e293b',
    '--mat-sys-surface-container-high': '#243147',
    '--mat-sys-surface-container-highest': '#334155',

    // Contorno y Sombra (4 tokens)
    '--mat-sys-outline': '#64748b',
    '--mat-sys-outline-variant': '#334155',
    '--mat-sys-shadow': '#000000',
    '--mat-sys-scrim': '#000000',
  };

  return { light, dark };
}

/**
 * Inyecta o actualiza la hoja de estilos dinámicos de Angular Material M3 en el <head>,
 * asegurando la sincronización de los 49 tokens en modo claro y modo oscuro.
 */
export function applyMaterialTokens(hex: string): void {
  if (typeof document === 'undefined') return;

  const styleId = 'mat-sys-dynamic-tokens';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const { light, dark } = generateMaterialPalette(hex);

  const lightCss = Object.entries(light)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const darkCss = Object.entries(dark)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  styleEl.textContent = `
html {
${lightCss}
}

html.dark {
${darkCss}
}
`;
}
