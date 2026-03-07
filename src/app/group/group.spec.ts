import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { GroupPage } from './group';

describe('GroupPage', () => {
  let component: GroupPage;
  let fixture: ComponentFixture<GroupPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupPage],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
