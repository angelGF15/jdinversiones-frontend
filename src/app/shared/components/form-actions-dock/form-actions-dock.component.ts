import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface DockProgressState {
  percentage: number;
  completedCount: number;
  totalCount: number;
  pendingFields?: string[];
  isComplete?: boolean;
  label?: string;
}

@Component({
  selector: 'app-form-actions-dock',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './form-actions-dock.component.html',
  styleUrls: ['./form-actions-dock.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormActionsDockComponent {
  // --- Estados de Formulario / Pantalla ---
  public readonly isEditMode = input<boolean>(false);
  public readonly isSubmitting = input<boolean>(false);
  public readonly isLoading = input<boolean>(false);
  public readonly isDirty = input<boolean>(false);
  public readonly isValid = input<boolean>(true);

  // --- Progreso Opcional (Modo Barra de Completación Minimalista) ---
  public readonly progress = input<DockProgressState | null>(null);

  // --- Slots / Personalización Extensible ---
  public readonly customStatus = input<boolean>(false);
  public readonly customActions = input<boolean>(false);

  // --- Configuración de Botones y Navegación ---
  public readonly backRoute = input<string | any[] | null>(null);
  public readonly backLabel = input<string>('Volver');
  public readonly showBack = input<boolean>(true);

  public readonly showDiscard = input<boolean>(true);
  public readonly discardLabel = input<string>('Descartar cambios');

  public readonly submitLabel = input<string>('');
  public readonly submitIcon = input<string>('');
  public readonly canSubmit = input<boolean>(true);
  public readonly submitType = input<'submit' | 'button'>('submit');

  // --- Etiquetas de Estado del Preset Estándar ---
  public readonly readyStateText = input<string>('Listo para guardar');
  public readonly pendingStateText = input<string>('Campos pendientes de validación');
  public readonly readySubtext = input<string>('Guarda las modificaciones para aplicarlas al catálogo');
  public readonly syncedSubtext = input<string>('No hay cambios pendientes de sincronizar');

  // --- Outputs de Eventos ---
  public readonly discardTriggered = output<void>();
  public readonly backTriggered = output<void>();
  public readonly submitTriggered = output<void>();

  // --- Valores Computados ---
  public readonly resolvedSubmitLabel = computed<string>(() => {
    const custom = this.submitLabel();
    if (custom) return custom;
    return this.isEditMode() ? 'Guardar Cambios' : 'Crear';
  });

  public readonly resolvedSubmitIcon = computed<string>(() => {
    const custom = this.submitIcon();
    if (custom) return custom;
    return this.isEditMode() ? 'save' : 'add_box';
  });

  public onDiscard(): void {
    if (!this.isDirty() || this.isSubmitting() || this.isLoading()) return;
    this.discardTriggered.emit();
  }

  public onBack(): void {
    this.backTriggered.emit();
  }

  public onSubmitClick(event: Event): void {
    if (this.submitType() === 'button') {
      event.preventDefault();
      this.submitTriggered.emit();
    }
  }
}
