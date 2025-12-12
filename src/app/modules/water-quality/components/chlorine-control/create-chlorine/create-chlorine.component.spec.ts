import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateChlorineComponent } from './create-chlorine.component';

describe('CreateChlorineComponent', () => {
  let component: CreateChlorineComponent;
  let fixture: ComponentFixture<CreateChlorineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateChlorineComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateChlorineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
