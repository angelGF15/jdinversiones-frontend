import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { CategoryFormComponent } from './category-form.component';
import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import { AuthState } from '../../../../../core/auth/auth.state';
import { Category, CategoryChild } from '../../../../../core/models/category.models';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  const mockChild: CategoryChild = {
    id: 'child-1',
    name: 'iPhones',
    slug: 'iphones',
    description: 'Teléfonos Apple',
    parentId: 'cat-1',
    imageUrl: null,
    displayOrder: 1,
    isActive: true,
    productCount: 5,
    childrenCount: 0,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  };

  const mockCategoryDetail: Category = {
    id: 'cat-1',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Dispositivos móviles',
    parentId: null,
    imageUrl: 'https://res.cloudinary.com/demo/smartphones.webp',
    displayOrder: 0,
    isActive: true,
    productCount: 15,
    childrenCount: 1,
    children: [mockChild],
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  };

  const mockParents: CategoryChild[] = [
    {
      id: 'cat-1',
      name: 'Smartphones',
      slug: 'smartphones',
      description: null,
      parentId: null,
      imageUrl: null,
      displayOrder: 0,
      isActive: true,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
    {
      id: 'cat-2',
      name: 'Computación',
      slug: 'computacion',
      description: null,
      parentId: null,
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
    mockChild,
  ];

  function setupModule(routeParams: Record<string, string> = {}, queryParams: Record<string, string> = {}) {
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', [
      'listParents',
      'getById',
      'create',
      'update',
      'setStatus',
    ]);
    categoriesServiceSpy.listParents.and.returnValue(of(mockParents));
    categoriesServiceSpy.getById.and.returnValue(of(mockCategoryDetail));
    categoriesServiceSpy.create.and.returnValue(of(mockCategoryDetail));
    categoriesServiceSpy.update.and.returnValue(of(mockCategoryDetail));
    categoriesServiceSpy.setStatus.and.returnValue(of(mockCategoryDetail));

    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);
    (authStateSpy as any).profile = signal({
      userId: 'admin-1',
      entityId: 'entity-1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jdinversiones.com',
      roles: ['Administrador'],
      permissions: ['CATEGORY_VIEW', 'CATEGORY_CREATE', 'CATEGORY_EDIT'],
    });
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: routeParams,
              queryParams: queryParams,
            },
          },
        },
      ],
      imports: [CategoryFormComponent],
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Modo Creación (/categories/new)', () => {
    beforeEach(() => {
      setupModule({}, {});
    });

    it('debe crearse en modo creación con formulario limpio', () => {
      expect(component).toBeTruthy();
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.controls.name.value).toBe('');
      expect(component.form.controls.slug.value).toBe('');
      expect(component.form.controls.displayOrder.value).toBe(0);
      expect(component.form.invalid).toBeTrue();
    });

    it('debe autogenerar el slug al escribir en el nombre cuando isCustomSlug es falso', () => {
      component.form.controls.name.setValue('Laptops & Computadoras');
      expect(component.form.controls.slug.value).toBe('laptops-computadoras');
    });

    it('no debe sobreescribir el slug autogenerado si el usuario activa el modo personalizado', () => {
      component.toggleCustomSlug();
      expect(component.isCustomSlug()).toBeTrue();

      component.form.controls.slug.setValue('mi-slug-personalizado');
      component.form.controls.name.setValue('Nuevo Nombre');

      expect(component.form.controls.slug.value).toBe('mi-slug-personalizado');
    });

    it('debe preseleccionar parentId si viene como queryParam en la ruta', () => {
      TestBed.resetTestingModule();
      setupModule({}, { parentId: 'cat-2' });

      expect(component.form.controls.parentId.value).toBe('cat-2');
    });

    it('debe crear la categoría y navegar a /admin/inventory/categories al enviar formulario válido', () => {
      component.form.patchValue({
        name: 'Monitores',
        slug: 'monitores',
        description: 'Pantallas LED y OLED',
        parentId: null,
        displayOrder: 2,
      });

      component.onSubmit();

      expect(categoriesServiceSpy.create).toHaveBeenCalledWith({
        name: 'Monitores',
        slug: 'monitores',
        description: 'Pantallas LED y OLED',
        parentId: null,
        displayOrder: 2,
      });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/inventory/categories']);
      expect(snackBarSpy.open).toHaveBeenCalled();
    });

    it('debe marcar conflicto 409 directamente en el campo slug si el backend reporta colisión', () => {
      categoriesServiceSpy.create.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'El slug "monitores" ya existe en el catálogo' },
            })
        )
      );

      component.form.patchValue({
        name: 'Monitores',
        slug: 'monitores',
      });

      component.onSubmit();

      expect(component.form.controls.slug.hasError('serverConflict')).toBeTrue();
      expect(component.form.controls.slug.getError('serverConflict')).toBe(
        'El slug "monitores" ya existe en el catálogo'
      );
    });
  });

  describe('Modo Edición (/categories/:id/edit)', () => {
    beforeEach(() => {
      setupModule({ id: 'cat-1' }, {});
    });

    it('debe crearse en modo edición y consultar getById(id)', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.categoryId()).toBe('cat-1');
      expect(categoriesServiceSpy.getById).toHaveBeenCalledWith('cat-1');
      expect(component.category()).toEqual(mockCategoryDetail);
      expect(component.subcategories().length).toBe(1);
      expect(component.form.controls.name.value).toBe('Smartphones');
      expect(component.form.controls.slug.value).toBe('smartphones');
    });

    it('debe filtrar la categoría actual y sus hijos de availableParents para prevenir ciclos jerárquicos', () => {
      const available = component.availableParents();
      const availableIds = available.map((p) => p.id);

      expect(availableIds).not.toContain('cat-1'); // La misma categoría
      expect(availableIds).not.toContain('child-1'); // Su hijo directo
      expect(availableIds).toContain('cat-2'); // Otra categoría disponible
    });

    it('debe actualizar la categoría y navegar a /admin/inventory/categories al guardar cambios', () => {
      component.form.patchValue({
        name: 'Smartphones y Celulares',
        slug: 'smartphones-celulares',
      });

      component.onSubmit();

      expect(categoriesServiceSpy.update).toHaveBeenCalledWith('cat-1', {
        name: 'Smartphones y Celulares',
        slug: 'smartphones-celulares',
        description: 'Dispositivos móviles',
        parentId: null,
        displayOrder: 0,
      });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/inventory/categories']);
    });

    it('debe mostrar mensaje de error si getById retorna 404', () => {
      categoriesServiceSpy.getById.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 404 }))
      );

      component.loadCategoryDetail('cat-inexistente');

      expect(component.errorMessage()).toContain('no existe o fue eliminada');
    });

    it('debe navegar a la subcategoría en onEditSubcategory', () => {
      component.onEditSubcategory(mockChild);
      expect(router.navigate).toHaveBeenCalledWith([
        '/admin/inventory/categories',
        'child-1',
        'edit',
      ]);
    });

    it('debe alternar el estado de una subcategoría hija previa confirmación modal', () => {
      const dialogRefSpy = {
        afterClosed: () => of(true),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      component.onToggleChildStatus(mockChild);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(categoriesServiceSpy.setStatus).toHaveBeenCalledWith('child-1', false);
      expect(snackBarSpy.open).toHaveBeenCalled();
    });

    it('debe abrir modal de conflicto 409 si la subcategoría no se puede desactivar por tener productos activos', () => {
      const dialogRefSpy = {
        afterClosed: () => of(true),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      categoriesServiceSpy.setStatus.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message:
                  'No se puede desactivar la subcategoría porque tiene productos asociados activos',
              },
            })
        )
      );

      component.onToggleChildStatus(mockChild);

      expect(dialogSpy.open).toHaveBeenCalledTimes(2);
    });
  });
});
