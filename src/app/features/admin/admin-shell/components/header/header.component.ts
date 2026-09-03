import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthState } from '../../../../../core/auth/auth.state';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public readonly authState = inject(AuthState);

  @Input() isSidebarCollapsed = false;

  @Output() toggleMobileMenu = new EventEmitter<void>();
  @Output() toggleSidebarCollapse = new EventEmitter<void>();
  @Output() logoutTriggered = new EventEmitter<void>();

  public onLogout(): void {
    this.logoutTriggered.emit();
  }
}
