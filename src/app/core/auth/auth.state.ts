import { Injectable, inject, signal, computed } from '@angular/core';
import { TokenStoreService } from './token-store.service';
import { AuthTokenPair, LoginResponse, Profile } from './models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthState {
  private readonly tokenStore = inject(TokenStoreService);

  // --- Signals de Estado Primario ---
  private readonly _profile = signal<Profile | null>(null);
  private readonly _isLoading = signal<boolean>(false);

  // Exposición readonly de signals primarios
  public readonly profile = this._profile.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();

  // --- Signals Computados ---
  public readonly isAuthenticated = computed(() => {
    return !!this._profile() && this.tokenStore.hasTokens();
  });

  public readonly roles = computed(() => {
    return this._profile()?.roles ?? [];
  });

  public readonly permissions = computed(() => {
    return this._profile()?.permissions ?? [];
  });

  public readonly fullName = computed(() => {
    const p = this._profile();
    if (!p) return '';
    return `${p.firstName} ${p.lastName}`.trim();
  });

  public readonly userEmail = computed(() => {
    return this._profile()?.email ?? '';
  });

  public readonly avatarUrl = computed(() => {
    return this._profile()?.avatarUrl ?? null;
  });

  constructor() {
    this.hydrateFromStorage();
  }

  /**
   * Hidrata la sesión inicial en memoria desde el almacenamiento local si existen tokens válidos.
   */
  public hydrateFromStorage(): void {
    if (this.tokenStore.hasTokens()) {
      const storedProfile = this.tokenStore.getStoredProfile();
      if (storedProfile) {
        this._profile.set(storedProfile);
      }
    }
  }

  /**
   * Establece una nueva sesión autenticada con tokens y perfil.
   */
  public setSession(response: LoginResponse): void {
    this.tokenStore.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
    this.tokenStore.saveProfile(response.profile);
    this._profile.set(response.profile);
    this._isLoading.set(false);
  }

  /**
   * Actualiza el par de tokens tras una rotación de refresh exitosa.
   */
  public updateTokens(tokens: AuthTokenPair): void {
    this.tokenStore.setTokens(tokens);
  }

  /**
   * Actualiza el perfil en memoria y almacenamiento (ej. tras GET /auth/me).
   */
  public setProfile(profile: Profile | null): void {
    this._profile.set(profile);
    if (profile) {
      this.tokenStore.saveProfile(profile);
    }
  }

  /**
   * Modifica el estado global de carga de autenticación.
   */
  public setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  /**
   * Descarta todos los tokens y estado de sesión.
   */
  public clearSession(): void {
    this.tokenStore.clear();
    this._profile.set(null);
    this._isLoading.set(false);
  }

  // --- Verificaciones RBAC ---

  /**
   * Comprueba si el usuario autenticado tiene el rol indicado.
   */
  public hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  /**
   * Comprueba si el usuario autenticado posee el permiso requerido.
   */
  public hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  /**
   * Comprueba si el usuario autenticado posee al menos uno de los permisos indicados.
   */
  public hasAnyPermission(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    const userPerms = this.permissions();
    return permissions.some((p) => userPerms.includes(p));
  }

  /**
   * Comprueba si el usuario autenticado posee todos los permisos indicados.
   */
  public hasAllPermissions(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    const userPerms = this.permissions();
    return permissions.every((p) => userPerms.includes(p));
  }
}
