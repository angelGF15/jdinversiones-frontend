import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [PaginationComponent],
    });

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    component.page = 1;
    component.pageSize = 20;
    component.total = 45;
    component.totalPages = 3;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe calcular fromItem y toItem correctamente en la primera página', () => {
    expect(component.fromItem).toBe(1);
    expect(component.toItem).toBe(20);
  });

  it('debe calcular fromItem y toItem correctamente en la última página incompleta', () => {
    component.page = 3;
    expect(component.fromItem).toBe(41);
    expect(component.toItem).toBe(45);
  });

  it('debe retornar 0 en fromItem y toItem si total === 0', () => {
    component.total = 0;
    expect(component.fromItem).toBe(0);
    expect(component.toItem).toBe(0);
  });

  it('debe deshabilitar prev y first en la página 1', () => {
    expect(component.canPrev).toBeFalse();
    expect(component.canNext).toBeTrue();
  });

  it('debe emitir pageChange al hacer clic en siguiente (onNext)', () => {
    spyOn(component.pageChange, 'emit');
    component.onNext();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('debe emitir pageChange al hacer clic en anterior (onPrev) desde página 2', () => {
    component.page = 2;
    spyOn(component.pageChange, 'emit');
    component.onPrev();
    expect(component.pageChange.emit).toHaveBeenCalledWith(1);
  });

  it('debe emitir pageChange con totalPages al hacer clic en onLast()', () => {
    spyOn(component.pageChange, 'emit');
    component.onLast();
    expect(component.pageChange.emit).toHaveBeenCalledWith(3);
  });

  it('debe emitir pageSizeChange cuando se selecciona un nuevo tamaño', () => {
    spyOn(component.pageSizeChange, 'emit');
    component.onSizeSelect(50);
    expect(component.pageSizeChange.emit).toHaveBeenCalledWith(50);
  });


});
