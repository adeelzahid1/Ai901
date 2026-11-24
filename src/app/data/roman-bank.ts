import { Injectable, effect, inject, signal } from '@angular/core';
import { Language } from '../core/language';
import { PreparedQuestion } from '../core/prepare';
import { RomanText, translate } from '../core/translate';
import { Question } from './schema';

type RomanFile = Record<string, RomanText>;

/**
 * Roman Urdu overlays, one per bank file and each its own lazy chunk. Add a new file here when it
 * is created in `data/roman/`; `npm run validate:bank` checks that the two lists match.
 */
const LOADERS: Record<string, () => Promise<unknown>> = {
  'd1-core': () => import('./roman/d1-core.json').then((m) => m.default),
  'd1-ext1': () => import('./roman/d1-ext1.json').then((m) => m.default),
  'd1-ext2': () => import('./roman/d1-ext2.json').then((m) => m.default),
  'd1-ext3': () => import('./roman/d1-ext3.json').then((m) => m.default),
  'd1-ext4': () => import('./roman/d1-ext4.json').then((m) => m.default),
  'd1-ext5': () => import('./roman/d1-ext5.json').then((m) => m.default),
  'd1-ext6': () => import('./roman/d1-ext6.json').then((m) => m.default),
  'd1-ext7': () => import('./roman/d1-ext7.json').then((m) => m.default),
  'd1-ext8': () => import('./roman/d1-ext8.json').then((m) => m.default),
  'd1-ext9': () => import('./roman/d1-ext9.json').then((m) => m.default),
  'd1-ext10': () => import('./roman/d1-ext10.json').then((m) => m.default),
  'd1-ext11': () => import('./roman/d1-ext11.json').then((m) => m.default),
  'd1-ext12': () => import('./roman/d1-ext12.json').then((m) => m.default),
  'd1-ext13': () => import('./roman/d1-ext13.json').then((m) => m.default),
  'd1-ext14': () => import('./roman/d1-ext14.json').then((m) => m.default),
  'd2-core': () => import('./roman/d2-core.json').then((m) => m.default),
  'd2-ext1': () => import('./roman/d2-ext1.json').then((m) => m.default),
  'd2-ext2': () => import('./roman/d2-ext2.json').then((m) => m.default),
  'd2-ext3': () => import('./roman/d2-ext3.json').then((m) => m.default),
  'd2-ext4': () => import('./roman/d2-ext4.json').then((m) => m.default),
  'd2-ext5': () => import('./roman/d2-ext5.json').then((m) => m.default),
  'd2-ext6': () => import('./roman/d2-ext6.json').then((m) => m.default),
  'd2-ext7': () => import('./roman/d2-ext7.json').then((m) => m.default),
  'd2-ext8': () => import('./roman/d2-ext8.json').then((m) => m.default),
  'd2-ext9': () => import('./roman/d2-ext9.json').then((m) => m.default),
};

/** Loads the Roman Urdu question text when that language is on and applies it to questions. */
@Injectable({ providedIn: 'root' })
export class RomanBank {
  private readonly language = inject(Language);
  private readonly texts = signal<ReadonlyMap<string, RomanText>>(new Map());
  private readonly ready = signal(false);
  private pending: Promise<void> | null = null;

  constructor() {
    effect(() => {
      if (this.language.roman()) void this.load();
    });
  }

  /** Loads every overlay once. A failed download leaves the questions in English and can be retried. */
  load(): Promise<void> {
    this.pending ??= Promise.all(Object.values(LOADERS).map((loader) => loader()))
      .then((files) => {
        this.texts.set(new Map(files.flatMap((f) => Object.entries(f as RomanFile))));
        this.ready.set(true);
      })
      .catch(() => {
        this.pending = null;
      });
    return this.pending;
  }

  /** The question in the current language. Pass the recorded `optOrder` for shuffled questions. */
  localize(q: Question, optOrder: PreparedQuestion['optOrder'] = null): Question {
    return this.language.roman() ? translate(q, this.texts().get(q.id), optOrder) : q;
  }

  /** True when Roman Urdu is on but this question has no translation yet. */
  missing(q: Question): boolean {
    return this.language.roman() && this.ready() && !this.texts().has(q.id);
  }
}
