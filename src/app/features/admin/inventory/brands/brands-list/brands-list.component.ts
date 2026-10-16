import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brands-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brands-list.component.html',
  styleUrls: ['./brands-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsListComponent {}
