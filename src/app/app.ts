import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingService } from './core/services/loading.service';
import { GlobalSkeletonLoaderComponent } from './shared/components/global-skeleton-loader/global-skeleton-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, GlobalSkeletonLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('jdinversiones-frontend');
  public readonly loadingService = inject(LoadingService);
}
