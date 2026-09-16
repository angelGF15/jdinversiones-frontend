import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthTokenPair, Profile } from './models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class TokenStoreService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly ACCESS_TOKEN_KEY = 'jd_access_token';
  private readonly REFRESH_TOKEN_KEY = 'jd_refresh_token';
  private readonly USER_PROFILE_KEY = 'jd_user_profile';

  private readonly _accessToken$ = new BehaviorSubject<string | null>(null);
  public readonly accessToken$: Observable<string | null> = this._accessToken$.asObservable();

  constructor() {
    if (this.isBrowser) {
      this._accessToken$.next(this.getAccessToken());
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public setTokens(tokens: AuthTokenPair): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      this._accessToken$.next(tokens.accessToken);
    } catch {
      // Manejo de cuota excedida o almacenamiento deshabilitado
    }
  }

  public getTokens(): AuthTokenPair | null {
    if (!this.isBrowser) return null;

    try {
      const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
    } catch {
      return null;
    }

    return null;
  }

  public getAccessToken(): string | null {
    if (!this.isBrowser) return null;

    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public getRefreshToken(): string | null {
    if (!this.isBrowser) return null;

    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public saveProfile(profile: Profile): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Manejo seguro en caso de error de serialización o storage
    }
  }

  public getStoredProfile(): Profile | null {
    if (!this.isBrowser) return null;

    try {
      const raw = localStorage.getItem(this.USER_PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  }

  public clear(): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_PROFILE_KEY);
      } catch {
        // Ignorar errores al limpiar
      }
    }

    this._accessToken$.next(null);
  }

  public hasTokens(): boolean {
    return !!this.getAccessToken();
  }
}
