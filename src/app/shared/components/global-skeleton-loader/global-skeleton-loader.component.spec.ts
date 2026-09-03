import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GlobalSkeletonLoaderComponent } from './global-skeleton-loader.component';

describe('GlobalSkeletonLoaderComponent', () => {
  let component: GlobalSkeletonLoaderComponent;
  let fixture: ComponentFixture<GlobalSkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSkeletonLoaderComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSkeletonLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con atributos de accesibilidad', () => {
    expect(component).toBeTruthy();
    const container = fixture.nativeElement.querySelector('.global-skeleton-container');
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-busy')).toBe('true');
  });

  it('debe renderizar por defecto la variante full', () => {
    expect(component.variant).toBe('full');
    const heroSkeleton = fixture.nativeElement.querySelector('.h-64');
    expect(heroSkeleton).toBeTruthy();
  });

  it('debe renderizar la variante login cuando se le especifica', () => {
    fixture.componentRef.setInput('variant', 'login');
    fixture.detectChanges();

    const techPattern = fixture.nativeElement.querySelector('.bg-tech-pattern');
    expect(techPattern).toBeTruthy();

    const card = fixture.nativeElement.querySelector('.max-w-md');
    expect(card).toBeTruthy();
  });

  it('debe renderizar la variante admin cuando se le especifica', () => {
    fixture.componentRef.setInput('variant', 'admin');
    fixture.detectChanges();

    const sidebar = fixture.nativeElement.querySelector('aside');
    expect(sidebar).toBeTruthy();

    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
  });
});
