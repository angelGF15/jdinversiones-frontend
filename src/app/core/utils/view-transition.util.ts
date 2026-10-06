/**
 * Ejecuta una mutación visual (cambio de color de marca o alternancia claro/oscuro)
 * utilizando la View Transitions API con fallback inmediato en navegadores
 * sin soporte o cuando el usuario tiene activado 'prefers-reduced-motion'.
 */
export function runWithViewTransition(apply: () => void): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    apply();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (updateCallback: () => void | Promise<void>) => unknown;
  };

  const prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof doc.startViewTransition !== 'function' || prefersReduced) {
    apply();
    return;
  }

  // En entornos de testing headless (Karma), Chrome Headless carece de compositor GPU
  // activo y aborta el renderizado si se invoca la API nativa sin mock/espía.
  const isKarma = typeof (window as unknown as { __karma__?: unknown }).__karma__ !== 'undefined';
  const isNative = doc.startViewTransition.toString().includes('[native code]');
  if (isKarma && isNative) {
    apply();
    return;
  }

  try {
    doc.startViewTransition(() => {
      apply();
    });
  } catch {
    apply();
  }
}
