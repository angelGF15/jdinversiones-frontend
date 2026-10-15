import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attributes-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attributes-list.component.html',
  styleUrls: ['./attributes-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributesListComponent {}
