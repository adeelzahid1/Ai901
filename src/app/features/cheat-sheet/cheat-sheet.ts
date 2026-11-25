import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Language } from '../../core/language';
import { CheatSheetData, loadCheatSheet } from '../../data/cheat-sheet';
import { DOMAINS, SECTIONS } from '../../data/schema';
import { CheatTable } from './cheat-table';

const on = (value: boolean) => new FormControl(value, { nonNullable: true });

/** Tables, numbers, status codes and commands on one page, with a layout for printing or saving as PDF. */
@Component({
  selector: 'app-cheat-sheet',
  imports: [ReactiveFormsModule, RouterLink, CheatTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cheat-sheet.html',
  styleUrl: './cheat-sheet.css',
})
export class CheatSheet {
  private readonly document = inject(DOCUMENT);
  protected readonly language = inject(Language);

  protected readonly domains = DOMAINS;
  private readonly data = signal<CheatSheetData | null>(null);
  protected readonly form = new FormGroup({
    domain: new FormControl('all', { nonNullable: true }),
    numbers: on(true),
    when: on(true),
    reference: on(true),
    commands: on(true),
    points: on(false),
  });
  protected readonly show = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** The parts of the sheet for the chosen domain, with the section title of each lesson. */
  protected readonly sheet = computed(() => {
    const data = this.data();
    if (!data) return null;
    const domain = this.show().domain;
    const inDomain = (d: string | undefined) => domain === 'all' || d === domain;
    const lessons = data.lessons.flatMap((lesson) => {
      const section = SECTIONS.find((s) => s.id === lesson.id);
      return section && inDomain(section.domain) ? [{ ...lesson, name: this.language.section(section) }] : [];
    });
    return {
      numbers: data.numbers,
      lessons,
      tables: data.tables.filter((t) => inDomain(t.domain)),
      code: data.code.filter((c) => inDomain(c.domain)),
    };
  });

  constructor() {
    inject(PendingTasks).run(async () => this.data.set(await loadCheatSheet()));
  }

  protected print(): void {
    this.document.defaultView?.print();
  }
}
