import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CloneRoleRequest } from '../../../../../core/models/role.models';

export interface CloneRoleData {
  sourceRoleName: string;
  sourcePermissionsCount: number;
}

@Component({
  selector: 'app-clone-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './clone-role-dialog.component.html',
  styleUrls: ['./clone-role-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloneRoleDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CloneRoleDialogComponent>);
  public readonly data: CloneRoleData = inject(MAT_DIALOG_DATA);

  public readonly form = this.fb.group({
    name: [
      `${this.data.sourceRoleName} (copia)`.slice(0, 50),
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    ],
    description: ['', [Validators.maxLength(255)]],
  });

  public onConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name!.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
    } satisfies CloneRoleRequest);
  }

  public onCancel(): void {
    this.dialogRef.close(null);
  }
}
