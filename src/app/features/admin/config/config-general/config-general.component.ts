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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ConfigService } from '../../../../core/services/config.service';
import { BrandService } from '../../../../core/services/brand.service';
import {
  ConfigGroup,
  Setting,
  UpdateSettingItem,
} from '../../../../core/models/config.models';
import {
  LogoUploadDialogComponent,
  LogoUploadDialogData,
} from '../../../../shared/components/logo-upload-dialog/logo-upload-dialog.component';

export interface ConfigSettingRow {
  setting: Setting;
  control: FormControl<string | null>;
}

export interface ConfigSettingGroupView {
  code: string;
  label: string;
  description: string;
  icon: string;
  rows: ConfigSettingRow[];
}

@Component({
  selector: 'app-config-general',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatDialogModule,
    HasPermissionDirective,
  ],
  templateUrl: './config-general.component.html',
  styleUrls: ['./config-general.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigGeneralComponent implements OnInit {
  @Input({ required: true }) public canEdit!: boolean;

  private readonly fb = inject(FormBuilder);
  private readonly configService = inject(ConfigService);
  private readonly brandService = inject(BrandService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private formSub?: Subscription;

  // --- Señales de Estado ---
  public readonly settings = signal<Setting[]>([]);
  public readonly groups = signal<ConfigGroup[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSaving = signal<boolean>(false);
  public readonly isDeletingLogo = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly savedMessage = signal<string | null>(null);
  public readonly themeNoticeVisible = signal<boolean>(true);

  // --- Señal de Cambios Pendientes ---
  public readonly dirtyItems = signal<UpdateSettingItem[]>([]);

  // --- Formulario Reactivo ---
  public form: FormGroup = this.fb.group({});

  // --- Señales Computadas ---
  public readonly rows = computed<ConfigSettingRow[]>(() => {
    const controls = this.form.controls;
    return this.settings().map((setting) => {
      const control = (controls[setting.key] as FormControl<string | null>) ?? null;
      return { setting, control };
    });
  });

  public readonly groupedRows = computed<ConfigSettingGroupView[]>(() => {
    const allRows = this.rows();
    return this.groups()
      .map((group) => {
        const matchingRows = allRows
          .filter((r) => r.setting.groupCode === group.code)
          .sort((a, b) => a.setting.sortOrder - b.setting.sortOrder);
        return {
          code: group.code,
          label: group.label,
          description: group.description,
          icon: group.icon,
          rows: matchingRows,
        };
      })
      .filter((g) => g.rows.length > 0);
  });

  public readonly dirtyCount = computed<number>(() => this.dirtyItems().length);
  public readonly isDirty = computed<boolean>(() => this.dirtyCount() > 0);

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
          this.groups.set(res.groups || []);
          this.settings.set(res.settings || []);
          this.buildForm(res.settings || []);
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
    this.formSub?.unsubscribe();
    const controls: Record<string, FormControl<string | null>> = {};

    for (const setting of settings) {
      controls[setting.key] = this.fb.control<string | null>(setting.value, {
        nonNullable: false,
        validators: this.buildValidators(setting),
      });

      if (!this.canEdit) {
        controls[setting.key].disable();
      }
    }

    this.form = this.fb.group(controls);
    this.form.markAsPristine();
    this.updateDirtyState();

    this.formSub = this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateDirtyState();
      });
  }

  public updateDirtyState(): void {
    const changed: UpdateSettingItem[] = [];
    const settingsMap = new Map(this.settings().map((s) => [s.key, s]));

    for (const [key, control] of Object.entries(this.form.controls)) {
      const orig = settingsMap.get(key);
      if (!orig) continue;

      const originalNormalized = this.normalizeValue(orig.value);
      const currentNormalized = this.normalizeValue(control.value);

      if (currentNormalized !== originalNormalized) {
        changed.push({
          key,
          value: currentNormalized,
        });
      }
    }

    this.dirtyItems.set(changed);
  }

  private buildValidators(setting: Setting): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    const type = setting.type;

    // Obligatoriedad
    if (setting.isRequired) {
      validators.push(Validators.required);
    }

    // Longitud máxima
    if (type?.maxLength && type.maxLength > 0) {
      validators.push(Validators.maxLength(type.maxLength));
    } else if (type?.code !== 'image' && type?.code !== 'number') {
      validators.push(Validators.maxLength(500));
    }

    // Validaciones específicas por widget
    if (type?.code === 'email') {
      validators.push(Validators.email);
    } else if (type?.code === 'number') {
      validators.push(Validators.pattern(/^-?\d+$/));
    } else if (type?.code === 'color') {
      validators.push(Validators.pattern(/^#[0-9a-fA-F]{6}$/));
    } else if (type?.code === 'url') {
      validators.push(Validators.pattern(/^https?:\/\/.+/i));
    } else if (type?.code === 'theme') {
      validators.push(Validators.pattern(/^(light|dark)$/));
    }

    // Patrón regex provisto por el backend si no coincide con los estándares ya definidos
    if (type?.pattern && type.code !== 'email' && type.code !== 'url' && type.code !== 'number') {
      try {
        validators.push(Validators.pattern(new RegExp(type.pattern)));
      } catch {
        // En caso de expresión regular no soportada por el motor local
      }
    }

    return validators;
  }

  public onColorPickerChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const ctrl = this.form.get(key);
    if (ctrl) {
      ctrl.setValue(input.value);
      ctrl.markAsDirty();
      ctrl.markAsTouched();
      this.updateDirtyState();
    }
  }

  public openLogoDialog(currentUrl: string | null): void {
    if (!this.canEdit) return;

    const dialogRef = this.dialog.open<LogoUploadDialogComponent, LogoUploadDialogData, { logoUrl: string } | null>(
      LogoUploadDialogComponent,
      {
        width: '100%',
        maxWidth: '480px',
        panelClass: 'logo-dialog-panel',
        data: { currentLogoUrl: currentUrl },
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.logoUrl) {
        // Actualizar control y estado local
        const ctrl = this.form.get('company_logo_url');
        if (ctrl) {
          ctrl.setValue(result.logoUrl);
          ctrl.markAsPristine();
        }
        this.settings.update((items) =>
          items.map((s) => (s.key === 'company_logo_url' ? { ...s, value: result.logoUrl } : s))
        );
        this.updateDirtyState();
      }
    });
  }

  public deleteLogo(): void {
    if (!this.canEdit || this.isDeletingLogo()) return;

    const confirmed = window.confirm(
      '¿Deseas restablecer el logotipo institucional? Se volverá a mostrar el logo predeterminado del sistema.'
    );
    if (!confirmed) return;

    this.isDeletingLogo.set(true);
    this.configService
      .deleteLogo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeletingLogo.set(false);
          const ctrl = this.form.get('company_logo_url');
          if (ctrl) {
            ctrl.setValue(null);
            ctrl.markAsPristine();
          }
          this.settings.update((items) =>
            items.map((s) => (s.key === 'company_logo_url' ? { ...s, value: null } : s))
          );
          this.updateDirtyState();
          this.brandService.refresh().subscribe();
          this.snackBar.open('Logotipo restablecido al valor predeterminado.', 'Cerrar', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isDeletingLogo.set(false);
          const msg = this.extractMessage(err, 'No se pudo restablecer el logotipo.');
          this.snackBar.open(msg, 'Entendido', { duration: 4000 });
        },
      });
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
          this.mergeSettings(res.settings);

          // Actualizar valores en el formulario para los controles modificados
          for (const item of res.settings) {
            const ctrl = this.form.get(item.key);
            if (ctrl) {
              ctrl.setValue(item.value, { emitEvent: false });
              ctrl.markAsPristine();
            }
          }
          this.form.markAsPristine();
          this.updateDirtyState();

          // Sincronizar dinámicamente si se actualizó el color primario
          const colorSetting = res.settings.find((s) => s.key === 'primary_color');
          if (colorSetting && colorSetting.value) {
            this.brandService.applyPrimaryColor(colorSetting.value, true);
          }

          // Si cambiaron nombres o textos de marca, refrescar branding global
          if (
            updatedKeys.includes('company_name') ||
            updatedKeys.includes('company_tagline') ||
            updatedKeys.includes('company_logo_url')
          ) {
            this.brandService.refresh().subscribe();
          }

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
    this.updateDirtyState();
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

  public getError(setting: Setting): string {
    const control = this.form.get(setting.key);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Debe ser un correo electrónico válido.';
    }
    if (control.hasError('pattern')) {
      if (setting.type?.code === 'color') {
        return 'Debe ser un código hexadecimal válido (ej: #032EDD).';
      }
      if (setting.type?.code === 'number') {
        return 'Debe ser un número entero válido.';
      }
      if (setting.type?.code === 'url') {
        return 'Debe ser un enlace web válido (ej: https://...).';
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
    return group.code;
  }

  public trackByRowKey(_: number, row: ConfigSettingRow): string {
    return row.setting.key;
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
