import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CustomInput } from './custom-input';

describe('CustomInput', () => {
  let component: CustomInput;
  let fixture: ComponentFixture<CustomInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomInput],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
