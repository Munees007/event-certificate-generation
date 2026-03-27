import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateDesign } from './certificate-design';

describe('CertificateDesign', () => {
  let component: CertificateDesign;
  let fixture: ComponentFixture<CertificateDesign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificateDesign],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificateDesign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
