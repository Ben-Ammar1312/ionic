import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertsGenPage } from './alerts-gen.page';

describe('AlertsGenPage', () => {
  let component: AlertsGenPage;
  let fixture: ComponentFixture<AlertsGenPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertsGenPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
