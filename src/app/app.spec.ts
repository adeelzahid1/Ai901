import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  afterEach(() => localStorage.removeItem('ai901-lang'));

  beforeEach(async () => {
    localStorage.removeItem('ai901-lang');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the brand and every main tab in the top bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand')?.textContent).toContain('AI-901');
    const tabs = [...el.querySelectorAll('nav a')].map((a) => a.textContent?.trim());
    expect(tabs).toEqual(['Dashboard', 'Study', 'Practice', 'Mock Test', 'Exam', 'Weak areas']);
  });

  it('switches the whole interface with the EN | Roman toggle', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-language-toggle button');
    expect([...buttons].map((b) => b.textContent?.trim())).toEqual(['EN', 'Roman']);
    buttons[1].click();
    await fixture.whenStable();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('nav')?.textContent).toContain('Kamzor hissay');
    buttons[0].click();
    await fixture.whenStable();
    expect(el.querySelector('nav')?.textContent).toContain('Weak areas');
  });
});
