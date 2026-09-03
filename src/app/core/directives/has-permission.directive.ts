import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthState } from '../auth/auth.state';

/**
 * Directiva estructural que condiciona el renderizado de elementos del DOM
 * según los permisos RBAC del usuario autenticado.
 * 
 * Uso:
 * - Permiso único: `<button *hasPermission="'PRODUCT_CREATE'">Crear</button>`
 * - Múltiples permisos (al menos uno): `<div *hasPermission="['PRODUCT_EDIT', 'PRODUCT_DELETE']">Acciones</div>`
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authState = inject(AuthState);

  public readonly hasPermission = input.required<string | string[]>();

  private hasView = false;

  constructor() {
    effect(() => {
      const required = this.hasPermission();
      const isAllowed = Array.isArray(required)
        ? this.authState.hasAnyPermission(required)
        : this.authState.hasPermission(required);

      if (isAllowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isAllowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
