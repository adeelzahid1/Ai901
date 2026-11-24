import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOMAINS, SECTIONS } from '../data/schema';
import { UI_TEXT } from '../i18n/ui-text';
import { Language } from './language';

/** Every text of a language as `path -> value`, with text functions called with sample numbers. */
function flatten(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'function') return [[path, String((value as (...a: unknown[]) => unknown)(1, 2, 3, 4, 5))]];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => flatten(v, `${path}.${k}`));
  return [[path, String(value)]];
}

describe('Language', () => {
  beforeEach(() => {
    localStorage.removeItem('ai901-lang');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });
  afterEach(() => {
    localStorage.removeItem('ai901-lang');
    document.documentElement.lang = 'en';
  });

  it('starts in English, switches to Roman Urdu and remembers the choice', () => {
    const language = TestBed.inject(Language);
    expect(language.ui().nav.study).toBe('Study');
    language.set('ro');
    TestBed.tick();
    expect(language.ui().nav.study).toBe('Parhai');
    expect(document.documentElement.lang).toBe('ur-Latn');
    expect(JSON.parse(localStorage.getItem('ai901-lang') ?? '""')).toBe('ro');
  });

  it('opens in the saved language and ignores unknown values', () => {
    localStorage.setItem('ai901-lang', '"ro"');
    expect(TestBed.inject(Language).roman()).toBeTrue();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    localStorage.setItem('ai901-lang', '"xx"');
    expect(TestBed.inject(Language).roman()).toBeFalse();
  });

  it('names domains, sections and finished sessions in the current language', () => {
    const language = TestBed.inject(Language);
    expect(language.area('1.1')).toBe(SECTIONS[0].en);
    expect(language.area('D2')).toBe(DOMAINS[1].name);
    expect(language.sessionTitle({ mode: 'mock', title: 'old', total: 30 }, 'AI-901')).toBe('Mock test · 30 questions');
    language.set('ro');
    expect(language.area('1.1')).toBe(SECTIONS[0].ro);
    expect(language.area('D2')).toBe(DOMAINS[1].ro);
    expect(language.sessionTitle({ mode: 'mock', title: 'old', total: 30 }, 'AI-901')).toBe('Mock test · 30 sawal');
    expect(language.sessionTitle({ mode: 'practice', title: 'old', total: 3 }, 'AI-901')).toBe('old');
  });

  it('has text for every interface string in both languages', () => {
    const en = flatten(UI_TEXT.en);
    const ro = flatten(UI_TEXT.ro);
    expect(ro.map(([path]) => path)).toEqual(en.map(([path]) => path));
    for (const [path, text] of [...en, ...ro]) expect(text.trim().length).withContext(path).toBeGreaterThan(0);
    const same = en.filter(([path, text], i) => text === ro[i][1] && text.length > 25).map(([path]) => path);
    expect(same).toEqual([]);
  });

  it('has a Roman Urdu name for every domain, section and sub-skill', () => {
    for (const d of DOMAINS) {
      expect(d.ro && d.shortRo).withContext(d.id).toBeTruthy();
      for (const s of d.subs) expect(s.ro).withContext(s.id).toBeTruthy();
    }
    for (const s of SECTIONS) expect(s.ro).withContext(s.id).toBeTruthy();
  });
});
