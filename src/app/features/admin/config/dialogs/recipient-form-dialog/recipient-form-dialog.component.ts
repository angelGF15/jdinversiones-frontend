import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CreateNotificationRecipientRequest,
  NotificationChannel,
  NotificationRecipient,
  NotificationRecipientType,
  UpdateNotificationRecipientRequest,
} from '../../../../../core/models/config.models';

export interface RecipientFormDialogData {
  /** null ⇒ modo creación. */
  recipient: NotificationRecipient | null;
  channels: NotificationChannel[];
  recipientTypes: NotificationRecipientType[];
}

@Component({
  selector: 'app-recipient-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './recipient-form-dialog.component.html',
  styleUrls: ['./recipient-form-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipientFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RecipientFormDialogComponent>);
  public readonly data: RecipientFormDialogData = inject(MAT_DIALOG_DATA);

  public readonly isEditMode = signal<boolean>(this.data.recipient !== null);
  public readonly errorMessage = signal<string | null>(null);

  public readonly form = this.fb.group({
    channelId: [
      { value: this.data.recipient?.channelId ?? '', disabled: this.isEditMode() },
      [Validators.required],
    ],
    recipientTypeId: [
      { value: this.data.recipient?.recipientTypeId ?? '', disabled: this.isEditMode() },
      [Validators.required],
    ],
    contact: [
      this.data.recipient?.contact ?? '',
      [Validators.required, Validators.maxLength(150)],
    ],
    label: [this.data.recipient?.label ?? '', [Validators.maxLength(80)]],
  });

  public readonly isChannelLocked = computed<boolean>(() => this.isEditMode());

  public getChannelLabel(id: string): string {
    return this.data.channels.find((c) => c.id === id)?.name ?? '—';
  }

  public getRecipientTypeLabel(id: string): string {
    return this.data.recipientTypes.find((t) => t.id === id)?.name ?? '—';
  }

  public onConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const label = raw.label?.trim() ? raw.label.trim() : null;

    if (this.isEditMode()) {
      const payload: UpdateNotificationRecipientRequest = {
        contact: raw.contact!.trim(),
        label,
      };
      this.dialogRef.close(payload);
    } else {
      const payload: CreateNotificationRecipientRequest = {
        channelId: raw.channelId!,
        recipientTypeId: raw.recipientTypeId!,
        contact: raw.contact!.trim(),
        label,
      };
      this.dialogRef.close(payload);
    }
  }

  public onCancel(): void {
    this.dialogRef.close(null);
  }

  public getError(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors || !(control.dirty || control.touched)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('maxlength')) {
      const max = control.getError('maxlength')?.requiredLength;
      return `No puede exceder los ${max} caracteres.`;
    }
    return 'Valor inválido.';
  }
}
