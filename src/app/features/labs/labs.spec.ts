import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LabProgress } from '../../core/lab-progress';
import { Language } from '../../core/language';
import { loadLabs } from '../../data/labs';
import { SECTIONS } from '../../data/schema';
import { Labs } from './labs';

describe('Labs', () => {
  let fixture: ComponentFixture<Labs>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('ai901-labs');
    localStorage.removeItem('ai901-lang');
    await TestBed.configureTestingModule({
      imports: [Labs],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(Labs);
    fixture.componentRef.setInput('l', 'chat-client');
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('ai901-labs');
    localStorage.removeItem('ai901-lang');
  });

  it('has complete labs in both languages that belong to study sections', async () => {
    const labs = await loadLabs();
    expect(labs.length).toBeGreaterThanOrEqual(8);
    expect(new Set(labs.map((l) => l.id)).size).toBe(labs.length);
    for (const lab of labs) {
      expect(lab.sections.every((s) => SECTIONS.some((x) => x.id === s))).withContext(lab.id).toBeTrue();
      expect(lab.ref).withContext(lab.id).toMatch(/^https:\/\/learn\.microsoft\.com\/en-us\//);
      for (const text of [lab.title, lab.goal, lab.cost, lab.clean, ...lab.steps, ...lab.check]) {
        expect(text.en && text.ro && text.en !== text.ro).withContext(`${lab.id}: ${text.en}`).toBeTruthy();
      }
    }
  });

  it('opens the requested lab and remembers finished steps', async () => {
    const open = [...el().querySelectorAll<HTMLDetailsElement>('details[open]')];
    expect(open.map((d) => d.id)).toEqual(['chat-client']);
    open[0].querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(LabProgress).count('chat-client')).toBe(1);
    expect(JSON.parse(localStorage.getItem('ai901-labs') ?? '{}')).toEqual({ 'chat-client': [0] });
    expect(open[0].querySelector('summary')?.textContent).toContain('1 of 6');
  });

  it('can be left before the labs are loaded', async () => {
    const other = TestBed.createComponent(Labs);
    other.detectChanges();
    other.destroy();
    await expectAsync(loadLabs()).toBeResolved();
    await fixture.whenStable();
  });

  it('shows the labs in Roman Urdu', async () => {
    TestBed.inject(Language).set('ro');
    await fixture.whenStable();
    expect(el().textContent).toContain('Python chat client banana');
  });
});
