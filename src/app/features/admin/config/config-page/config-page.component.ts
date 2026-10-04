import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthState } from '../../../../core/auth/auth.state';
import { ConfigGeneralComponent } from '../config-general/config-general.component';
import { ConfigRecipientsComponent } from '../config-recipients/config-recipients.component';

export type ConfigTab = 'general' | 'recipients';

export interface ConfigTabOption {
  key: ConfigTab;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-config-page',
  standalone: true,
  imports: [
    CommonModule,
    ConfigGeneralComponent,
    ConfigRecipientsComponent,
  ],
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigPageComponent {
  private readonly authState = inject(AuthState);

  // --- Señales de Estado ---
  public readonly activeTab = signal<ConfigTab>('general');

  public readonly tabs: ConfigTabOption[] = [
    {
      key: 'general',
      label: 'Configuración general',
      icon: 'tune',
      description: 'Empresa, redes, umbrales y moneda',
    },
    {
      key: 'recipients',
      label: 'Contactos de notificación',
      icon: 'notifications_active',
      description: 'Destinatarios de las alertas del sistema',
    },
  ];

  // --- Señales Computadas ---
  public readonly activeTabOption = computed<ConfigTabOption>(
    () => this.tabs.find((t) => t.key === this.activeTab()) ?? this.tabs[0]
  );

  public readonly canEdit = computed<boolean>(() =>
    this.authState.hasPermission('CONFIG_EDIT')
  );

  public selectTab(tab: ConfigTab): void {
    this.activeTab.set(tab);
  }
}
