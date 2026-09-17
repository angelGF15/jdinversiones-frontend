import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { DataTableComponent } from './data-table.component';
import { DataTableColumnDirective } from './data-table-column.directive';
import { DataTableColumn } from '../../models/data-table.models';

interface TestRow {
  id: string;
  name: string;
  createdAt: string;
  amount: number;
  status: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, DataTableComponent, DataTableColumnDirective],
  template: `
    <app-data-table
      [columns]="columns"
      [data]="data()"
      [loading]="loading()"
      (rowClick)="onRowClicked($event)"
    >
      <ng-template [dataTableColumn]="'status'" let-row>
        <span class="custom-status-badge">{{ row.status | uppercase }}</span>
      </ng-template>
    </app-data-table>
  `,
})
class TestHostComponent {
  columns: DataTableColumn<TestRow>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'createdAt', header: 'Fecha', type: 'date' },
    { key: 'amount', header: 'Monto', type: 'currency' },
    { key: 'status', header: 'Estado' },
    { header: 'Acciones', stickyEnd: true },
  ];

  data = signal<TestRow[]>([
    {
      id: '1',
      name: 'Producto A',
      createdAt: '2026-09-01T12:00:00Z',
      amount: 1500,
      status: 'activo',
    },
  ]);

  loading = signal<boolean>(false);
  clickedRow: TestRow | null = null;

  onRowClicked(row: TestRow) {
    this.clickedRow = row;
  }
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TestHostComponent, DataTableComponent, DataTableColumnDirective],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y renderizar los encabezados de columna', () => {
    const ths = fixture.nativeElement.querySelectorAll('thead th');
    expect(ths.length).toBe(5);
    expect(ths[0].textContent.trim()).toBe('Nombre');
    expect(ths[1].textContent.trim()).toBe('Fecha');
    expect(ths[2].textContent.trim()).toBe('Monto');
    expect(ths[3].textContent.trim()).toBe('Estado');
    expect(ths[4].textContent.trim()).toBe('Acciones');
  });

  it('debe aplicar formato básico, de fecha y moneda en celdas estándar', () => {
    const tds = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(tds[0].textContent.trim()).toContain('Producto A');
    // Verifica que se aplicó el pipe date y currency
    expect(tds[1].textContent.trim()).not.toBe('2026-09-01T12:00:00Z');
    expect(tds[2].textContent.trim()).toContain('1,500.00');
  });

  it('debe renderizar la plantilla personalizada inyectada mediante dataTableColumn', () => {
    const badge = fixture.nativeElement.querySelector('.custom-status-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('ACTIVO');
  });

  it('debe emitir rowClick cuando se hace clic en una fila', () => {
    const row = fixture.nativeElement.querySelector('tbody tr');
    row.click();
    expect(host.clickedRow).toEqual(host.data()[0]);
  });

  it('debe aplicar la clase sticky-end-col en encabezado y celda con stickyEnd=true', () => {
    const stickyTh = fixture.nativeElement.querySelectorAll('thead th')[4];
    expect(stickyTh.classList.contains('sticky-end-col')).toBeTrue();

    const stickyTd = fixture.nativeElement.querySelectorAll('tbody tr td')[4];
    expect(stickyTd.classList.contains('sticky-end-col')).toBeTrue();
  });

  it('debe mostrar skeleton shimmer animado cuando loading=true', () => {
    host.loading.set(true);
    fixture.detectChanges();

    const skeletonDivs = fixture.nativeElement.querySelectorAll('.skeleton-shimmer-light');
    expect(skeletonDivs.length).toBeGreaterThan(0);
  });

  it('debe mostrar empty state cuando data=[] y loading=false', () => {
    host.data.set([]);
    host.loading.set(false);
    fixture.detectChanges();

    const emptyTitle = fixture.nativeElement.querySelector('h3');
    expect(emptyTitle).toBeTruthy();
    expect(emptyTitle.textContent.trim()).toBe('Sin resultados');
  });
});
