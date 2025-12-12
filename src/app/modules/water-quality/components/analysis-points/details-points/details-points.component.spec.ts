import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsPointsComponent } from './details-points.component';

describe('DetailsPointsComponent', () => {
  let component: DetailsPointsComponent;
  let fixture: ComponentFixture<DetailsPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsPointsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailsPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
