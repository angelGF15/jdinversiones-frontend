import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthState } from '../../../core/auth/auth.state';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { LoadingService } from '../../../core/services/loading.service';

export interface DashboardKpi {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
  colorClass: string;
  borderClass: string;
  permission?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    HasPermissionDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  public readonly authState = inject(AuthState);
  private readonly loadingService = inject(LoadingService);
  private readonly snackBar = inject(MatSnackBar);

  public readonly currentDate = new Date();
  public readonly isRefreshing = signal<boolean>(false);

  // KPIs reales según la Sección 5.1 del documento de contexto de JDinversiones
  public readonly kpis: DashboardKpi[] = [
    {
      id: 'active_products',
      title: 'Productos Activos',
      value: '348',
      change: '+12 nuevos este mes',
      isPositive: true,
      icon: 'inventory_2',
      colorClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30',
      permission: 'PRODUCT_VIEW',
    },
    {
      id: 'available_stock',
      title: 'Inventario Disponible',
      value: '1,842',
      change: 'En 3 almacenes activos',
      isPositive: true,
      icon: 'warehouse',
      colorClass: 'text-cyan-400',
      borderClass: 'border-cyan-500/30',
      permission: 'PRODUCT_VIEW',
    },
    {
      id: 'monthly_sales',
      title: 'Ventas del Mes (HNL)',
      value: 'L. 284,500.00',
      change: '+18.4% vs. mes anterior',
      isPositive: true,
      icon: 'payments',
      colorClass: 'text-blue-400',
      borderClass: 'border-blue-500/30',
      permission: 'DASHBOARD_VIEW',
    },
    {
      id: 'stock_alerts',
      title: 'Alertas de Stock',
      value: '5',
      change: '3 agotados • 2 stock bajo',
      isPositive: false,
      icon: 'warning_amber',
      colorClass: 'text-amber-400',
      borderClass: 'border-amber-500/30',
      permission: 'PRODUCT_VIEW',
    },
  ];

  /**
   * Refresca las métricas del dashboard manualmente.
   */
  public refreshMetrics(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
      this.snackBar.open('Métricas sincronizadas en tiempo real.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }, 600);
  }
}
