import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotePeek } from './note-peek';

describe('NotePeek', () => {
  let fixture: ComponentFixture<NotePeek>;
  const el = () => fixture.nativeElement as HTMLElement;
  const click = async () => {
    el().querySelector('button')?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.removeItem('ai901-lang');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(NotePeek);
    fixture.componentRef.setInput('skill', 'genai-how');
    fixture.componentRef.setInput('strong', true);
    await fixture.whenStable();
  });

  it('opens the short note in place and links the full note in a new tab', async () => {
    expect(el().querySelector('button')?.classList).toContain('primary');
    await click();
    expect(el().querySelector('.main')?.textContent).toContain('next token');
    const link = el().querySelector('a');
    expect(link?.getAttribute('href')).toBe('/notes?n=genai-how');
    expect(link?.target).toBe('_blank');
    await click();
    expect(el().querySelector('.peek')).toBeNull();
  });

  it('closes when the question is about another skill', async () => {
    await click();
    fixture.componentRef.setInput('skill', 'prompts');
    await fixture.whenStable();
    expect(el().querySelector('.peek')).toBeNull();
    await click();
    expect(el().querySelector('a')?.getAttribute('href')).toBe('/notes?n=prompts');
  });
});
