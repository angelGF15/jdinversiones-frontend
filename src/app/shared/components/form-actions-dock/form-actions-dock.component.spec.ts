import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

import {
  FormActionsDockComponent,
  DockProgressState,
} from './form-actions-dock.component';

describe('FormActionsDockComponent', () => {
  let component: FormActionsDockComponent;
  let fixture: ComponentFixture<FormActionsDockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormActionsDockComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormActionsDockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con valores predeterminados', () => {
    expect(component).toBeTruthy();
    expect(component.resolvedSubmitLabel()).toBe('Crear');
    expect(component.resolvedSubmitIcon()).toBe('add_box');
  });

  it('debe computar las etiquetas adecuadas en modo edición', () => {
    fixture.componentRef.setInput('isEditMode', true);
    fixture.detectChanges();

    expect(component.resolvedSubmitLabel()).toBe('Guardar Cambios');
    expect(component.resolvedSubmitIcon()).toBe('save');
  });

  it('debe renderizar el preset de barra de progreso cuando se suministra el input progress', () => {
    const progressData: DockProgressState = {
      percentage: 60,
      completedCount: 3,
      totalCount: 5,
      pendingFields: ['Categoría', 'Precio'],
      isComplete: false,
    };

    fixture.componentRef.setInput('progress', progressData);
    fixture.detectChanges();

    const percentageBadge = fixture.debugElement.query(By.css('.tabular-nums'));
    expect(percentageBadge.nativeElement.textContent).toContain('60%');

    const progressBar = fixture.debugElement.query(By.css('[role="progressbar"]'));
    expect(progressBar).toBeTruthy();
    expect(progressBar.attributes['aria-valuenow']).toBe('60');
  });

  it('debe emitir discardTriggered al hacer clic en Descartar cuando isDirty es true', () => {
    let discarded = false;
    component.discardTriggered.subscribe(() => {
      discarded = true;
    });

    fixture.componentRef.setInput('isDirty', true);
    fixture.detectChanges();

    const discardBtn = fixture.debugElement.query(
      By.css('button:not([type="submit"])')
    );
    expect(discardBtn).toBeTruthy();

    discardBtn.nativeElement.click();
    expect(discarded).toBeTrue();
  });

  it('no debe emitir discardTriggered si isDirty es false', () => {
    let discarded = false;
    component.discardTriggered.subscribe(() => {
      discarded = true;
    });

    fixture.componentRef.setInput('isDirty', false);
    fixture.detectChanges();

    component.onDiscard();
    expect(discarded).toBeFalse();
  });

  it('debe deshabilitar el botón submit si canSubmit es false o isSubmitting es true', () => {
    fixture.componentRef.setInput('canSubmit', false);
    fixture.detectChanges();

    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBeTrue();

    fixture.componentRef.setInput('canSubmit', true);
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    expect(submitBtn.nativeElement.disabled).toBeTrue();
  });
});
