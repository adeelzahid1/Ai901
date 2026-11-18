import { Injectable, PendingTasks, computed, inject, signal } from '@angular/core';
import { BANK_FILES, DOMAINS, DomainId, Question, SECTIONS, sectionOf } from './schema';

type BankLoader = () => Promise<unknown>;

/**
 * Every bank file is its own lazy chunk. Add new files here and in `blueprint.json` (`bankFiles`).
 */
const LOADERS: Record<string, BankLoader> = {
  'd1-core': () => import('./bank/d1-core.json').then((m) => m.default),
  'd1-ext1': () => import('./bank/d1-ext1.json').then((m) => m.default),
  'd1-ext2': () => import('./bank/d1-ext2.json').then((m) => m.default),
  'd1-ext3': () => import('./bank/d1-ext3.json').then((m) => m.default),
  'd1-ext4': () => import('./bank/d1-ext4.json').then((m) => m.default),
  'd1-ext5': () => import('./bank/d1-ext5.json').then((m) => m.default),
  'd1-ext6': () => import('./bank/d1-ext6.json').then((m) => m.default),
  'd1-ext7': () => import('./bank/d1-ext7.json').then((m) => m.default),
  'd1-ext8': () => import('./bank/d1-ext8.json').then((m) => m.default),
  'd1-ext9': () => import('./bank/d1-ext9.json').then((m) => m.default),
  'd1-ext10': () => import('./bank/d1-ext10.json').then((m) => m.default),
  'd1-ext11': () => import('./bank/d1-ext11.json').then((m) => m.default),
  'd1-ext12': () => import('./bank/d1-ext12.json').then((m) => m.default),
  'd1-ext13': () => import('./bank/d1-ext13.json').then((m) => m.default),
  'd2-core': () => import('./bank/d2-core.json').then((m) => m.default),
  'd2-ext1': () => import('./bank/d2-ext1.json').then((m) => m.default),
  'd2-ext2': () => import('./bank/d2-ext2.json').then((m) => m.default),
  'd2-ext3': () => import('./bank/d2-ext3.json').then((m) => m.default),
  'd2-ext4': () => import('./bank/d2-ext4.json').then((m) => m.default),
  'd2-ext5': () => import('./bank/d2-ext5.json').then((m) => m.default),
  'd2-ext6': () => import('./bank/d2-ext6.json').then((m) => m.default),
  'd2-ext7': () => import('./bank/d2-ext7.json').then((m) => m.default),
  'd2-ext8': () => import('./bank/d2-ext8.json').then((m) => m.default),
  'd2-ext9': () => import('./bank/d2-ext9.json').then((m) => m.default),
  'd2-ext10': () => import('./bank/d2-ext10.json').then((m) => m.default),
  'd2-ext11': () => import('./bank/d2-ext11.json').then((m) => m.default),
  'd2-ext12': () => import('./bank/d2-ext12.json').then((m) => m.default),
  'd2-ext13': () => import('./bank/d2-ext13.json').then((m) => m.default),
  'd2-ext14': () => import('./bank/d2-ext14.json').then((m) => m.default),
  'd2-ext15': () => import('./bank/d2-ext15.json').then((m) => m.default),
  'd2-ext16': () => import('./bank/d2-ext16.json').then((m) => m.default),
  'd2-ext17': () => import('./bank/d2-ext17.json').then((m) => m.default),
  'd2-ext18': () => import('./bank/d2-ext18.json').then((m) => m.default),
};

/** Loads the question bank one domain at a time and keeps it in signals. */
@Injectable({ providedIn: 'root' })
export class QuestionBank {
  private readonly pendingTasks = inject(PendingTasks);
  private readonly pending = new Map<DomainId, Promise<Question[]>>();
  private readonly byDomain = signal<Partial<Record<DomainId, Question[]>>>({});

  /** All questions loaded so far, in domain order. */
  readonly questions = computed(() => DOMAINS.flatMap((d) => this.byDomain()[d.id] ?? []));

  readonly loaded = computed(() => DOMAINS.every((d) => this.byDomain()[d.id] !== undefined));

  readonly countBySection = computed(() => {
    const counts = new Map<string, number>(SECTIONS.map((s) => [s.id, 0]));
    for (const q of this.questions()) {
      const s = sectionOf(q);
      if (s) counts.set(s.id, (counts.get(s.id) ?? 0) + 1);
    }
    return counts;
  });

  loadDomain(id: DomainId): Promise<Question[]> {
    const existing = this.pending.get(id);
    if (existing) return existing;

    const p = Promise.all(BANK_FILES[id].map((file) => this.loadFile(file))).then((parts) => {
      const list = parts.flat();
      this.byDomain.update((m) => ({ ...m, [id]: list }));
      return list;
    });
    // Keeps server rendering waiting until the bank is in the signals.
    this.pendingTasks.run(() => p);
    this.pending.set(id, p);
    return p;
  }

  async loadAll(): Promise<Question[]> {
    await Promise.all(DOMAINS.map((d) => this.loadDomain(d.id)));
    return this.questions();
  }

  private async loadFile(file: string): Promise<Question[]> {
    const loader = LOADERS[file];
    if (!loader) throw new Error(`No loader registered for bank file "${file}"`);
    return (await loader()) as Question[];
  }
}
