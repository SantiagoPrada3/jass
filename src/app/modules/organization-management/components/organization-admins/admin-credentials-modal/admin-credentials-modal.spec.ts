import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCredentialsModal } from './admin-credentials-modal';

describe('AdminCredentialsModal', () => {
  let component: AdminCredentialsModal;
  let fixture: ComponentFixture<AdminCredentialsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCredentialsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCredentialsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
