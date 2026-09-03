import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonVariant } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-skeleton-loader.component.html',
  styleUrls: ['./global-skeleton-loader.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSkeletonLoaderComponent {
  @Input() variant: SkeletonVariant = 'full';
  @Input() message?: string | null = null;
}
