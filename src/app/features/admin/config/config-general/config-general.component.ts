import {
  Component,
  OnInit,
  Input,
  DestroyRef,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ConfigService } from '../../../../core/services/config.service';
import {
  ConfigSettingGroup,
  ConfigSettingMeta,
  SETTINGS_GROUPS,
  SETTINGS_REGISTRY,
  Setting,
  UpdateSettingItem,
} from '../../../../core/models/config.models';

export interface ConfigSettingRow {
  setting: Setting;
  meta: ConfigSettingMeta;
  control: FormControl<string | null>;
}

export interface ConfigSettingGroupView {
  key: ConfigSettingGroup;
  label: string;
  description: string;
  icon: string;
  rows: ConfigSettingRow[];
}

@Component({
  selector: 'app-config-general',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, HasPermissionDirective],
  templateUrl: './config-general.component.html',
  styleUrls: ['./config-general.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigGeneralComponent implements OnInit {
  @Input({ required: true }) public canEdit!: boolean;

  private readonly fb = inject(FormBuilder);
  private readonly configService = inject(ConfigService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // --- Señales de Estado ---
  public readonly settings = signal<Setting[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSaving = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly savedMessage = signal<string | null>(null);
  public readonly themeNoticeVisible = signal<boolean>(true);

  // --- Formulario Reactivo ---
  public form: FormGroup = this.fb.group({});

  // --- Señales Computadas ---
  public readonly rows = computed<ConfigSettingRow[]>(() => {
    const controls = this.form.controls;
    return this.settings().map((setting) => {
      const meta = SETTINGS_REGISTRY[setting.key] ?? this.fallbackMeta(setting);
      const control = (controls[setting.key] as FormControl<string | null>) ?? null;
      return { setting, meta, control };
    });
  });

  public readonly groupedRows = computed<ConfigSettingGroupView[]>(() =>
    SETTINGS_GROUPS.map((group) => ({
      ...group,
      rows: this.rows().filter(
        (r) => r.meta.group === group.key && SETTINGS_REGISTRY[r.setting.key]
      ),
    })).filter((g) => g.rows.length > 0)
  );

  public readonly unknownRows = computed<ConfigSettingRow[]>(() =>
    this.rows().filter((r) => !SETTINGS_REGISTRY[r.setting.key])
  );

  public readonly dirtyCount = computed<number>(() => {
    // Escucha cambios en settings o status de controls
    return this.rows().filter((r) => r.control?.dirty).length;
  });

  public readonly isDirty = computed<boolean>(() => this.dirtyCount() > 0);

  public readonly dirtyItems = computed<UpdateSettingItem[]>(() =>
    this.rows()
      .filter((r) => r.control?.dirty)
      .map((r) => ({
        key: r.setting.key,
        value: this.normalizeValue(r.control.value),
      }))
  );

  public ngOnInit(): void {
    this.loadSettings();
  }

  public loadSettings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.savedMessage.set(null);

    this.configService
      .getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.settings.set(res.settings);
          this.buildForm(res.settings);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            this.extractMessage(err, 'No se pudo cargar la configuración del sistema.')
          );
        },
      });
  }

  private buildForm(settings: Setting[]): void {
    const controls: Record<string, FormControl<string | null>> = {};

    for (const setting of settings) {
      const meta = SETTINGS_REGISTRY[setting.key];
      controls[setting.key] = this.fb.control<string | null>(setting.value, {
        nonNullable: false,
        validators: this.buildValidators(setting.key, meta),
      });

      if (!this.canEdit) {
        controls[setting.key].disable();
      }
    }

    this.form = this.fb.group(controls);
    this.form.markAsPristine();
  }

  private buildValidators(key: string, meta?: ConfigSettingMeta): ValidatorFn[] {
    const validators: ValidatorFn[] = [Validators.maxLength(500)];

    if (meta?.widget === 'number') {
      validators.push(
        Validators.required,
        Validators.pattern(/^\d+$/),
        Validators.maxLength(9)
      );
      return validators;
    }
    if (meta?.widget === 'url') {
      validators.push(Validators.pattern(/^https?:\/\/.+/i));
      return validators;
    }
    if (meta?.widget === 'email') {
      validators.push(Validators.required, Validators.email, Validators.maxLength(150));
      return validators;
    }
    if (meta?.widget === 'tel') {
      validators.push(Validators.maxLength(50));
      return validators;
    }
    if (meta?.widget === 'currency') {
      validators.push(Validators.required, Validators.pattern(/^[A-Za-z]{3}$/));
      return validators;
    }
    if (meta?.widget === 'theme') {
      validators.push(Validators.required);
      return validators;
    }
    if (key === 'company_name') {
      validators.push(Validators.required, Validators.minLength(1), Validators.maxLength(100));
      return validators;
    }
    if (meta?.required) {
      validators.push(Validators.required);
    }
    return validators;
  }

  public save(): void {
    if (this.form.invalid || !this.isDirty()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.savedMessage.set(null);

    const items = this.dirtyItems();
    const updatedKeys = items.map((i) => i.key);

    this.configService
      .updateSettings(items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          // Fusión (merge) sobre el estado local
          this.mergeSettings(res.settings);

          // Actualizar valores en el formulario para los controles modificados y marcar como pristine
          for (const item of res.settings) {
            const ctrl = this.form.get(item.key);
            if (ctrl) {
              ctrl.setValue(item.value, { emitEvent: false });
              ctrl.markAsPristine();
            }
          }
          this.form.markAsPristine();

          const count = res.settings.length;
          this.savedMessage.set(
            `${count} ${count === 1 ? 'configuración actualizada' : 'configuraciones actualizadas'} correctamente.`
          );

          if (updatedKeys.includes('default_theme')) {
            this.themeNoticeVisible.set(true);
          }

          this.snackBar.open('Configuración guardada exitosamente.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving.set(false);
          const msg = this.extractMessage(err, 'No se pudo guardar la configuración.');
          this.errorMessage.set(msg);
          this.snackBar.open('Revisa los campos marcados e intenta de nuevo.', 'Entendido', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        },
      });
  }

  public discard(): void {
    for (const setting of this.settings()) {
      const ctrl = this.form.get(setting.key);
      if (ctrl) {
        ctrl.setValue(setting.value, { emitEvent: false });
        ctrl.markAsPristine();
        ctrl.markAsUntouched();
      }
    }
    this.form.markAsPristine();
    this.errorMessage.set(null);
    this.savedMessage.set(null);
  }

  private mergeSettings(updated: Setting[]): void {
    const byKey = new Map(updated.map((s) => [s.key, s]));
    this.settings.update((current) => current.map((s) => byKey.get(s.key) ?? s));
  }

  public normalizeValue(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const trimmed = String(raw).trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  public isInvalid(key: string): boolean {
    const control = this.form.get(key);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  public getError(key: string): string {
    const control = this.form.get(key);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Debe ser un correo electrónico válido.';
    }
    if (control.hasError('pattern')) {
      const meta = SETTINGS_REGISTRY[key];
      if (meta?.widget === 'number') {
        return 'Debe ser un número entero mayor o igual a 0.';
      }
      if (meta?.widget === 'currency') {
        return 'Debe ser un código ISO de 3 letras (ej: HNL).';
      }
      if (meta?.widget === 'url') {
        return 'Debe ser un enlace válido (ej: https://...).';
      }
      return 'Formato no válido.';
    }
    if (control.hasError('minlength')) {
      const min = control.getError('minlength')?.requiredLength;
      return `Debe tener al menos ${min} caracteres.`;
    }
    if (control.hasError('maxlength')) {
      const max = control.getError('maxlength')?.requiredLength;
      return `No puede exceder los ${max} caracteres.`;
    }
    return 'Valor inválido.';
  }

  public closeNotice(): void {
    this.themeNoticeVisible.set(false);
  }

  public trackByGroupKey(_: number, group: ConfigSettingGroupView): string {
    return group.key;
  }

  public trackByRowKey(_: number, row: ConfigSettingRow): string {
    return row.setting.key;
  }

  private fallbackMeta(setting: Setting): ConfigSettingMeta {
    return {
      label: setting.key,
      helper: setting.description ?? 'Configuración registrada en el sistema.',
      group: 'aplicacion',
      widget: 'text',
      icon: 'tune',
      required: false,
    };
  }

  private extractMessage(err: HttpErrorResponse, fallback: string): string {
    if (err.error?.message) {
      return Array.isArray(err.error.message)
        ? err.error.message.join(' · ')
        : String(err.error.message);
    }
    return fallback;
  }
}
