import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthState } from '../../../../../core/auth/auth.state';
import { MenuService } from '../../../../../core/services/menu.service';
import { MenuItem } from '../../../../../core/models/menu.models';

export type NavItem = MenuItem;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  public readonly authState = inject(AuthState);
  public readonly menuService = inject(MenuService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  @Input() isCollapsed = false;

  @Output() closeMobile = new EventEmitter<void>();
  @Output() logoutTriggered = new EventEmitter<void>();
  @Output() expandSidebar = new EventEmitter<void>();

  // Guarda los IDs de los grupos que se encuentran expandidos en el acordeón
  public readonly expandedGroups = signal<Set<string>>(new Set<string>());

  public ngOnInit(): void {
    // Carga las opciones de navegación data-driven desde el backend
    this.menuService.loadMenu().subscribe({
      next: () => {
        this.autoExpandActiveGroups();
      },
    });

    // Monitorea cambios de navegación para expandir automáticamente el grupo activo
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.autoExpandActiveGroups();
      });
  }

  /**
   * Alterna la expansión de un grupo colapsable (acordeón).
   * Si el sidebar está colapsado (modo mini), solicita expandir el sidebar para permitir interacción completa.
   */
  public toggleGroup(item: MenuItem): void {
    if (this.isCollapsed) {
      this.expandSidebar.emit();
      this.expandGroup(item.id);
      return;
    }

    this.expandedGroups.update((current) => {
      const updated = new Set(current);
      if (updated.has(item.id)) {
        updated.delete(item.id);
      } else {
        updated.add(item.id);
      }
      return updated;
    });
  }

  /**
   * Comprueba si un grupo con subopciones se encuentra expandido.
   */
  public isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups().has(groupId);
  }

  /**
   * Comprueba si la ruta activa actual pertenece a alguna de las subopciones del grupo.
   */
  public isGroupActive(item: MenuItem): boolean {
    if (!item.children || item.children.length === 0) {
      return false;
    }

    const currentUrl = this.router.url;
    return item.children.some((child) => {
      if (!child.route) return false;
      return currentUrl === child.route || currentUrl.startsWith(child.route + '/');
    });
  }

  /**
   * Expande un grupo específico por su ID.
   */
  public expandGroup(groupId: string): void {
    this.expandedGroups.update((current) => {
      if (current.has(groupId)) return current;
      const updated = new Set(current);
      updated.add(groupId);
      return updated;
    });
  }

  /**
   * Mapea el icono devuelto por el backend a Material Icons.
   */
  public getIcon(iconName: string): string {
    return this.menuService.getMaterialIcon(iconName);
  }

  /**
   * Reintenta cargar el menú en caso de error.
   */
  public retryLoad(): void {
    this.menuService.loadMenu().subscribe({
      next: () => {
        this.autoExpandActiveGroups();
      },
    });
  }

  /**
   * Cierra el drawer móvil al hacer clic en un enlace de navegación.
   */
  public onNavItemClick(): void {
    this.closeMobile.emit();
  }

  /**
   * Notifica la acción de cierre de sesión al layout contenedor.
   */
  public onLogout(): void {
    this.logoutTriggered.emit();
  }

  /**
   * Detecta si la ruta actual coincide con algún hijo y auto-expande el grupo padre correspondiente.
   */
  private autoExpandActiveGroups(): void {
    const currentMenu = this.menuService.menu();
    if (!currentMenu || currentMenu.length === 0) return;

    for (const item of currentMenu) {
      if (this.isGroupActive(item)) {
        this.expandGroup(item.id);
      }
    }
  }
}
