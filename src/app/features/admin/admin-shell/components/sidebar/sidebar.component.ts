import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthState } from '../../../../../core/auth/auth.state';
import { HasPermissionDirective } from '../../../../../core/directives/has-permission.directive';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  permission: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    HasPermissionDirective,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  public readonly authState = inject(AuthState);

  @Input() isOpen = false;
  @Input() isCollapsed = false;

  @Output() closeMobile = new EventEmitter<void>();
  @Output() logoutTriggered = new EventEmitter<void>();

  // 7 Módulos principales data-driven (Sección 5 del contexto de JDinversiones)
  public readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
      icon: 'dashboard',
      permission: 'DASHBOARD_VIEW',
    },
    {
      label: 'Inventario',
      route: '/admin/inventory',
      icon: 'inventory_2',
      permission: 'PRODUCT_VIEW',
      badge: 'Kardex',
    },
    {
      label: 'Ventas',
      route: '/admin/sales',
      icon: 'point_of_sale',
      permission: 'SALES_VIEW',
    },
    {
      label: 'Clientes',
      route: '/admin/customers',
      icon: 'people_alt',
      permission: 'CUSTOMER_VIEW',
    },
    {
      label: 'Órdenes',
      route: '/admin/orders',
      icon: 'shopping_bag',
      permission: 'ORDER_VIEW',
    },
    {
      label: 'Reportes',
      route: '/admin/reports',
      icon: 'analytics',
      permission: 'REPORT_VIEW',
    },
    {
      label: 'Administración',
      route: '/admin/settings',
      icon: 'admin_panel_settings',
      permission: 'USER_VIEW',
    },
  ];

  public onNavItemClick(): void {
    this.closeMobile.emit();
  }

  public onLogout(): void {
    this.logoutTriggered.emit();
  }
}
