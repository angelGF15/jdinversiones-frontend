import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AttributesService } from '../../../../../../core/services/attributes/attributes.service';
import { CatalogAttribute } from '../../../../../../core/models/attribute.models';
import {
  ProductAttributeItem,
  ProductAttributeInput,
} from '../../../../../../core/models/product.models';

export interface AttributeRowState {
  tempId: string;
  attributeId: string;
  value: string;
  displayOrder: number;
}

@Component({
  selector: 'app-product-attributes-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule],
  templateUrl: './product-attributes-editor.component.html',
  styleUrls: ['./product-attributes-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAttributesEditorComponent implements OnInit {
  private readonly attributesService = inject(AttributesService);
  private readonly destroyRef = inject(DestroyRef);

  /** Lista inicial de atributos del producto. */
  public readonly initialAttributes = input<ProductAttributeItem[]>([], { alias: 'attributes' });

  /** Modo solo lectura. */
  public readonly readonly = input<boolean>(false);

  /** Emite el arreglo de atributos listos para enviar al backend en Create o Update. */
  public readonly attributesChange = output<ProductAttributeInput[]>();

  // --- Signals de Estado ---
  public readonly rows = signal<AttributeRowState[]>([]);
  public readonly availableMasterAttributes = signal<CatalogAttribute[]>([]);
  public readonly isLoadingAttributes = signal<boolean>(false);

  /** IDs de atributos actualmente seleccionados (para evitar duplicados) */
  public readonly selectedAttributeIds = computed(() => {
    return new Set(this.rows().map((r) => r.attributeId).filter(Boolean));
  });

  /** Identifica si existen IDs de atributos repetidos */
  public readonly hasDuplicateAttributes = computed(() => {
    const ids = this.rows()
      .map((r) => r.attributeId)
      .filter(Boolean);
    return new Set(ids).size !== ids.length;
  });

  /** Atributos activos disponibles que aún no han sido seleccionados */
  public readonly unselectedAttributes = computed(() => {
    const selected = this.selectedAttributeIds();
    return this.availableMasterAttributes().filter((attr) => !selected.has(attr.id));
  });

  ngOnInit(): void {
    this.loadMasterAttributes();
    this.initializeRows();
  }

  private loadMasterAttributes(): void {
    this.isLoadingAttributes.set(true);
    this.attributesService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attrs) => {
          this.isLoadingAttributes.set(false);
          this.availableMasterAttributes.set(attrs || []);
        },
        error: () => {
          this.isLoadingAttributes.set(false);
        },
      });
  }

  private initializeRows(): void {
    const initial = this.initialAttributes() || [];
    if (initial.length > 0) {
      this.rows.set(
        initial.map((item, idx) => ({
          tempId: item.id || `row-${Date.now()}-${idx}`,
          attributeId: item.attributeId,
          value: item.value || '',
          displayOrder: item.displayOrder ?? idx + 1,
        }))
      );
    }
  }

  /**
   * Agrega una nueva fila de especificación vacía.
   */
  public onAddRow(): void {
    if (this.readonly()) return;

    // Buscar el primer atributo activo no seleccionado como valor sugerido
    const unselected = this.unselectedAttributes();
    const defaultAttrId = unselected.length > 0 ? unselected[0].id : '';

    const newRow: AttributeRowState = {
      tempId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      attributeId: defaultAttrId,
      value: '',
      displayOrder: this.rows().length + 1,
    };

    this.rows.update((list) => [...list, newRow]);
    this.emitChanges();
  }

  /**
   * Elimina una fila de la matriz y renumera las posiciones.
   */
  public onRemoveRow(tempId: string): void {
    if (this.readonly()) return;

    this.rows.update((list) => {
      const filtered = list.filter((r) => r.tempId !== tempId);
      return filtered.map((r, idx) => ({ ...r, displayOrder: idx + 1 }));
    });
    this.emitChanges();
  }

  /**
   * Reordena una fila hacia arriba o abajo en la lista.
   */
  public onMoveRow(index: number, direction: 'up' | 'down'): void {
    if (this.readonly()) return;
    const currentRows = [...this.rows()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= currentRows.length) return;

    // Intercambiar elementos
    const temp = currentRows[index];
    currentRows[index] = currentRows[targetIndex];
    currentRows[targetIndex] = temp;

    // Actualizar displayOrder secuencialmente
    const reordered = currentRows.map((r, idx) => ({ ...r, displayOrder: idx + 1 }));
    this.rows.set(reordered);
    this.emitChanges();
  }

  public onFieldChange(): void {
    this.emitChanges();
  }

  /**
   * Verifica si un atributo específico está seleccionado en otra fila distinta a la actual.
   */
  public isAttributeUsedInOtherRow(attrId: string, currentRowTempId: string): boolean {
    return this.rows().some(
      (r) => r.tempId !== currentRowTempId && r.attributeId === attrId
    );
  }

  /**
   * Obtiene el nombre del atributo maestro según su ID.
   */
  public getAttributeName(attrId: string): string {
    const found = this.availableMasterAttributes().find((a) => a.id === attrId);
    return found ? found.name : 'Atributo no encontrado';
  }

  /**
   * Emite el listado de atributos limpios para el backend.
   */
  private emitChanges(): void {
    const validInputs: ProductAttributeInput[] = this.rows()
      .filter((r) => r.attributeId && r.value.trim() !== '')
      .map((r, idx) => ({
        attributeId: r.attributeId,
        value: r.value.trim(),
        displayOrder: r.displayOrder || idx + 1,
      }));

    this.attributesChange.emit(validInputs);
  }
}
