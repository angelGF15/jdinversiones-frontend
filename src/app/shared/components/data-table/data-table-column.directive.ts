import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Directiva para definir plantillas personalizadas de celda en app-data-table.
 *
 * Ejemplo de uso:
 * ```html
 * <ng-template [dataTableColumn]="'roles'" let-user>
 *   @for (role of user.roles; track role.id) {
 *     <span class="badge">{{ role.name }}</span>
 *   }
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[dataTableColumn]',
  standalone: true,
})
export class DataTableColumnDirective {
  /**
   * Nombre o clave de la columna vinculada a esta plantilla.
   */
  @Input('dataTableColumn') name!: string;

  constructor(public readonly templateRef: TemplateRef<any>) {}
}
