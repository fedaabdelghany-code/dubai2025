import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SsoPage } from './sso.page';

describe('SsoPage', () => {
  let component: SsoPage;
  let fixture: ComponentFixture<SsoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SsoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
