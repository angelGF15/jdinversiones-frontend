import { runWithViewTransition } from './view-transition.util';

describe('runWithViewTransition', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('debe ejecutar el callback inmediatamente si document.startViewTransition no existe', () => {
    (document as unknown as { startViewTransition?: unknown }).startViewTransition = undefined;

    let executed = false;
    runWithViewTransition(() => {
      executed = true;
    });

    expect(executed).toBeTrue();
  });

  it('debe ejecutar el callback directamente sin startViewTransition si prefers-reduced-motion está activo', () => {
    const svtSpy = jasmine.createSpy('startViewTransition');
    (document as unknown as { startViewTransition?: unknown }).startViewTransition = svtSpy;

    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);

    let executed = false;
    runWithViewTransition(() => {
      executed = true;
    });

    expect(executed).toBeTrue();
    expect(svtSpy).not.toHaveBeenCalled();
  });

  it('debe invocar document.startViewTransition cuando está soportado y reduce-motion está apagado', () => {
    const svtSpy = jasmine.createSpy('startViewTransition').and.callFake((cb: () => void) => {
      cb();
      return {};
    });
    (document as unknown as { startViewTransition?: unknown }).startViewTransition = svtSpy;

    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);

    let executed = false;
    runWithViewTransition(() => {
      executed = true;
    });

    expect(executed).toBeTrue();
    expect(svtSpy).toHaveBeenCalled();
  });
});
