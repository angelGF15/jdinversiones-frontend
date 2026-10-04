import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ConfigService } from '../../../../core/services/config.service';
import {
  CreateNotificationRecipientRequest,
  NotificationChannel,
  NotificationRecipient,
  NotificationRecipientListQuery,
  NotificationRecipientType,
  UpdateNotificationRecipientRequest,
} from '../../../../core/models/config.models';
import { DataTableColumn, FilterToggle } from '../../../../shared/models/data-table.models';
import {
  DataTableComponent,
  DataTableColumnDirective,
  ListFiltersComponent,
} from '../../../../shared/components';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  RecipientFormDialogComponent,
  RecipientFormDialogData,
} from '../dialogs/recipient-form-dialog/recipient-form-dialog.component';

@Component({
  selector: 'app-config-recipients',
  standalone: true,
  imports: [
    CommonModule,
    MatTooltipModule,
    HasPermissionDirective,
    DataTableComponent,
    DataTableColumnDirective,
    ListFiltersComponent,
  ],
  templateUrl: './config-recipients.component.html',
  styleUrls: ['./config-recipients.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigRecipientsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) public canEdit!: boolean;

  private readonly configService = inject(ConfigService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subject = new Subject<NotificationRecipientListQuery>();

  // --- Señales de Estado ---
  public readonly recipients = signal<NotificationRecipient[]>([]);
  public readonly isActiveFilter = signal<boolean | null>(null);
  public readonly isLoading = signal<boolean>(false);
  public readonly isMutating = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly activeCount = signal<number>(0);

  // --- Catálogos ---
  public readonly channels = signal<NotificationChannel[]>([]);
  public readonly recipientTypes = signal<NotificationRecipientType[]>([]);
  public readonly catalogsReady = signal<boolean>(false);

  // --- Columnas y filtros (sin paginación) ---
  public readonly toggleFilters: FilterToggle[] = [
    { key: 'isActive', label: 'Solo activos' },
  ];

  public readonly columns: DataTableColumn<NotificationRecipient>[] = [
    { key: 'contact', header: 'Contacto', width: '260px' },
    { key: 'channelName', header: 'Canal', width: '150px' },
    { key: 'recipientTypeName', header: 'Tipo', width: '150px' },
    { key: 'label', header: 'Etiqueta', width: '200px' },
    { key: 'isActive', header: 'Estado', width: '120px', align: 'center' },
    { key: 'createdAt', header: 'Creado', type: 'date', width: '180px' },
    { header: 'Acciones', width: '120px', align: 'right', stickyEnd: true },
  ];

  public ngOnInit(): void {
    this.loadCatalogs();

    this.subject
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((query) =>
          this.configService.listRecipients(query).pipe(
            catchError((err: HttpErrorResponse) => {
              this.errorMessage.set(
                this.extractMessage(err, 'Ocurrió un error al cargar los contactos de notificación.')
              );
              return of(null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (res) {
          this.recipients.set(res.recipients);
          // Contamos activos solo si no está filtrado o contamos los activos de la respuesta
          const count = res.recipients.filter((r) => r.isActive).length;
          this.activeCount.set(count);
        }
      });

    this.subject.next({ isActive: this.isActiveFilter() });
  }

  public ngOnDestroy(): void {
    this.subject.complete();
  }

  private loadCatalogs(): void {
    forkJoin({
      channels: this.configService.listChannels(),
      recipientTypes: this.configService.listRecipientTypes(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ channels, recipientTypes }) => {
          this.channels.set(channels.channels);
          this.recipientTypes.set(recipientTypes.recipientTypes);
          this.catalogsReady.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            this.extractMessage(err, 'No se pudieron cargar los catálogos de notificación.')
          );
        },
      });
  }

  public onFilterChange(filters: Record<string, unknown>): void {
    const onlyActive = filters['isActive'] === true || filters['isActive'] === 'true';
    this.isActiveFilter.set(onlyActive ? true : null);
    this.subject.next({ isActive: this.isActiveFilter() });
  }

  public onCreate(): void {
    const dialogRef = this.dialog.open<
      RecipientFormDialogComponent,
      RecipientFormDialogData,
      CreateNotificationRecipientRequest | null
    >(RecipientFormDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        recipient: null,
        channels: this.channels(),
        recipientTypes: this.recipientTypes(),
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.mutate(
        this.configService.createRecipient(payload),
        'Contacto de notificación creado exitosamente.'
      );
    });
  }

  public onEdit(recipient: NotificationRecipient): void {
    const dialogRef = this.dialog.open<
      RecipientFormDialogComponent,
      RecipientFormDialogData,
      UpdateNotificationRecipientRequest | null
    >(RecipientFormDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        recipient,
        channels: this.channels(),
        recipientTypes: this.recipientTypes(),
      },
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.mutate(
        this.configService.updateRecipient(recipient.id, payload),
        `Contacto "${payload.contact ?? recipient.contact}" actualizado exitosamente.`
      );
    });
  }

  public onToggleStatus(recipient: NotificationRecipient): void {
    const next = !recipient.isActive;
    const isDisablingLast = !next && this.isLastActive(recipient);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: next ? 'Activar contacto' : 'Desactivar contacto',
        message: next
          ? `¿Deseas activar el contacto «${recipient.contact}»? Volverá a recibir notificaciones del sistema.`
          : isDisablingLast
            ? `«${recipient.contact}» es el ÚNICO contacto de notificación activo. El sistema requiere al menos uno activo para operar alertas. ¿Deseas desactivarlo de todas formas?`
            : `¿Deseas desactivar el contacto «${recipient.contact}»? Dejará de recibir alertas, pero podrás reactivarlo en cualquier momento.`,
        confirmText: next ? 'Sí, activar' : 'Sí, desactivar',
        isDestructive: !next,
        icon: next ? 'check_circle' : 'block',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.mutate(
        this.configService.setRecipientStatus(recipient.id, next),
        `Contacto ${next ? 'activado' : 'desactivado'} exitosamente.`
      );
    });
  }

  private mutate(obs: Observable<NotificationRecipient>, successMessage: string): void {
    this.isMutating.set(true);
    this.errorMessage.set(null);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.isMutating.set(false);

        // Actualización optimista de la lista
        this.recipients.update((list) => {
          const index = list.findIndex((r) => r.id === updated.id);
          if (index >= 0) {
            return list.map((r) => (r.id === updated.id ? updated : r));
          }
          return [updated, ...list];
        });

        // Si el filtro de activos está encendido y el nuevo estado no coincide, se retira de la vista
        if (this.isActiveFilter() !== null && updated.isActive !== this.isActiveFilter()) {
          this.recipients.update((list) => list.filter((r) => r.id !== updated.id));
        }

        // Recalcular contador de activos
        this.activeCount.set(this.recipients().filter((r) => r.isActive).length);

        this.snackBar.open(successMessage, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isMutating.set(false);
        const msg = this.extractMessage(err, 'No se pudo completar la operación.');
        this.errorMessage.set(msg);
        this.snackBar.open(msg, 'Entendido', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      },
    });
  }

  public isLastActive(recipient: NotificationRecipient): boolean {
    return recipient.isActive && this.activeCount() <= 1;
  }

  public getChannelIcon(code: string): string {
    const c = (code || '').toLowerCase();
    if (c.includes('mail') || c.includes('email')) return 'mail';
    if (c.includes('whatsapp') || c.includes('chat')) return 'chat';
    if (c.includes('sms')) return 'sms';
    return 'notifications';
  }

  public getChannelIconClass(code: string): string {
    const c = (code || '').toLowerCase();
    if (c.includes('mail') || c.includes('email')) return 'email';
    if (c.includes('whatsapp') || c.includes('chat')) return 'whatsapp';
    return 'default';
  }

  public reload(): void {
    this.subject.next({ isActive: this.isActiveFilter() });
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
