import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { ConfigPageComponent } from './config-page.component';
import { AuthState } from '../../../../core/auth/auth.state';
import { ConfigService } from '../../../../core/services/config.service';

describe('ConfigPageComponent', () => {
  let component: ConfigPageComponent;
  let fixture: ComponentFixture<ConfigPageComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    authStateSpy.hasPermission.and.returnValue(true);

    configServiceSpy = jasmine.createSpyObj('ConfigService', [
      'getSettings',
      'listRecipients',
      'listChannels',
      'listRecipientTypes',
    ]);
    configServiceSpy.getSettings.and.returnValue(of({ settings: [], groups: [] }));
    configServiceSpy.listRecipients.and.returnValue(of({ recipients: [] }));
    configServiceSpy.listChannels.and.returnValue(of({ channels: [] }));
    configServiceSpy.listRecipientTypes.and.returnValue(of({ recipientTypes: [] }));

    await TestBed.configureTestingModule({
      imports: [ConfigPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthState, useValue: authStateSpy },
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar 2 pestañas disponibles', () => {
    expect(component.tabs.length).toBe(2);
    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('debe tener "general" como pestaña activa por defecto', () => {
    expect(component.activeTab()).toBe('general');
    const compiled = fixture.nativeElement as HTMLElement;
    const generalPanel = compiled.querySelector('#config-panel-general');
    expect(generalPanel).toBeTruthy();
  });

  it('debe cambiar de pestaña al invocar selectTab("recipients")', () => {
    component.selectTab('recipients');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('recipients');
    const compiled = fixture.nativeElement as HTMLElement;
    const recipientsPanel = compiled.querySelector('#config-panel-recipients');
    expect(recipientsPanel).toBeTruthy();
  });

  it('debe reflejar canEdit en true si el usuario tiene permiso CONFIG_EDIT', () => {
    expect(component.canEdit()).toBeTrue();
    expect(authStateSpy.hasPermission).toHaveBeenCalledWith('CONFIG_EDIT');
  });

  it('debe reflejar canEdit en false si el usuario no tiene permiso CONFIG_EDIT', () => {
    authStateSpy.hasPermission.and.returnValue(false);
    const fixtureWithoutEdit = TestBed.createComponent(ConfigPageComponent);
    const compWithoutEdit = fixtureWithoutEdit.componentInstance;
    expect(compWithoutEdit.canEdit()).toBeFalse();
  });
});
