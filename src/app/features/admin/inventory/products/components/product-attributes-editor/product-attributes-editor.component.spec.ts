import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { ProductAttributesEditorComponent } from './product-attributes-editor.component';
import { AttributesService } from '../../../../../../core/services/attributes/attributes.service';
import { CatalogAttribute } from '../../../../../../core/models/attribute.models';
import { ProductAttributeItem } from '../../../../../../core/models/product.models';

describe('ProductAttributesEditorComponent', () => {
  let component: ProductAttributesEditorComponent;
  let fixture: ComponentFixture<ProductAttributesEditorComponent>;
  let attributesServiceSpy: jasmine.SpyObj<AttributesService>;

  const mockMasterAttributes: CatalogAttribute[] = [
    { id: 'attr-1', name: 'Almacenamiento', description: null, displayOrder: 1, isActive: true },
    { id: 'attr-2', name: 'Color', description: null, displayOrder: 2, isActive: true },
    { id: 'attr-3', name: 'RAM', description: null, displayOrder: 3, isActive: true },
  ];

  const mockProductAttributes: ProductAttributeItem[] = [
    {
      id: 'item-1',
      attributeId: 'attr-1',
      attributeName: 'Almacenamiento',
      value: '256 GB',
      displayOrder: 1,
    },
    {
      id: 'item-2',
      attributeId: 'attr-2',
      attributeName: 'Color',
      value: 'Titanio Natural',
      displayOrder: 2,
    },
  ];

  beforeEach(async () => {
    attributesServiceSpy = jasmine.createSpyObj('AttributesService', ['listActive']);
    attributesServiceSpy.listActive.and.returnValue(of(mockMasterAttributes));

    await TestBed.configureTestingModule({
      imports: [ProductAttributesEditorComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AttributesService, useValue: attributesServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductAttributesEditorComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y cargar el catálogo de atributos maestros activos', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(attributesServiceSpy.listActive).toHaveBeenCalled();
    expect(component.availableMasterAttributes()).toEqual(mockMasterAttributes);
  });

  it('debe inicializar las filas a partir del input attributes', () => {
    fixture.componentRef.setInput('attributes', mockProductAttributes);
    fixture.detectChanges();

    expect(component.rows().length).toBe(2);
    expect(component.rows()[0].attributeId).toBe('attr-1');
    expect(component.rows()[0].value).toBe('256 GB');
    expect(component.rows()[1].attributeId).toBe('attr-2');
    expect(component.rows()[1].value).toBe('Titanio Natural');
  });

  it('debe agregar una nueva fila y sugerir un atributo no seleccionado previamente', () => {
    fixture.componentRef.setInput('attributes', mockProductAttributes);
    fixture.detectChanges();

    component.onAddRow();

    expect(component.rows().length).toBe(3);
    // Attr-3 (RAM) es el único no usado
    expect(component.rows()[2].attributeId).toBe('attr-3');
    expect(component.rows()[2].displayOrder).toBe(3);
  });

  it('debe eliminar una fila y recalcular las posiciones displayOrder', () => {
    fixture.componentRef.setInput('attributes', mockProductAttributes);
    fixture.detectChanges();

    const firstRowTempId = component.rows()[0].tempId;
    component.onRemoveRow(firstRowTempId);

    expect(component.rows().length).toBe(1);
    expect(component.rows()[0].attributeId).toBe('attr-2');
    expect(component.rows()[0].displayOrder).toBe(1);
  });

  it('debe permitir reordenar filas hacia arriba y hacia abajo', () => {
    fixture.componentRef.setInput('attributes', mockProductAttributes);
    fixture.detectChanges();

    // Mover fila 0 hacia abajo
    component.onMoveRow(0, 'down');

    expect(component.rows()[0].attributeId).toBe('attr-2');
    expect(component.rows()[0].displayOrder).toBe(1);
    expect(component.rows()[1].attributeId).toBe('attr-1');
    expect(component.rows()[1].displayOrder).toBe(2);

    // Mover fila 1 hacia arriba
    component.onMoveRow(1, 'up');
    expect(component.rows()[0].attributeId).toBe('attr-1');
    expect(component.rows()[1].attributeId).toBe('attr-2');
  });

  it('debe detectar duplicados en tiempo real cuando se repite un attributeId', () => {
    fixture.componentRef.setInput('attributes', mockProductAttributes);
    fixture.detectChanges();

    expect(component.hasDuplicateAttributes()).toBeFalse();

    // Asignar el mismo atributo a ambas filas
    component.rows.update((list) => [
      { ...list[0], attributeId: 'attr-1' },
      { ...list[1], attributeId: 'attr-1' },
    ]);

    expect(component.hasDuplicateAttributes()).toBeTrue();
    expect(
      component.isAttributeUsedInOtherRow('attr-1', component.rows()[0].tempId)
    ).toBeTrue();
  });

  it('debe emitir attributesChange con datos válidos omitiendo filas vacías', () => {
    fixture.detectChanges();

    spyOn(component.attributesChange, 'emit');

    component.rows.set([
      { tempId: 't1', attributeId: 'attr-1', value: '256 GB', displayOrder: 1 },
      { tempId: 't2', attributeId: 'attr-2', value: '   ', displayOrder: 2 }, // vacío, se omite
      { tempId: 't3', attributeId: '', value: 'Sin ID', displayOrder: 3 }, // sin ID, se omite
    ]);

    component.onFieldChange();

    expect(component.attributesChange.emit).toHaveBeenCalledWith([
      { attributeId: 'attr-1', value: '256 GB', displayOrder: 1 },
    ]);
  });
});
