import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsChlorineComponent } from './details-chlorine.component';

describe('DetailsChlorineComponent', () => {
  let component: DetailsChlorineComponent;
  let fixture: ComponentFixture<DetailsChlorineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsChlorineComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailsChlorineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
