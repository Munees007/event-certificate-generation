import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateEventDetails } from './create-event-details';

describe('CreateEventDetails', () => {
  let component: CreateEventDetails;
  let fixture: ComponentFixture<CreateEventDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEventDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEventDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
