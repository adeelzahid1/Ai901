import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, EXAM, SECTIONS } from '../../data/schema';

interface SectionRow {
  id: string;
  title: string;
  count: number;
  target: number;
  percent: number;
}

/** Temporary Phase 1 page: shows how far the question bank has grown per study section. */
@Component({
  selector: 'app-bank-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bank-overview.html',
  styleUrl: './bank-overview.css',
})
export class BankOverview {
  private readonly bank = inject(QuestionBank);

  protected readonly exam = EXAM;
  protected readonly loaded = this.bank.loaded;
  protected readonly total = computed(() => this.bank.questions().length);
  protected readonly target = SECTIONS.reduce((sum, s) => sum + s.target, 0);

  protected readonly domains = computed(() => {
    const counts = this.bank.countBySection();
    return DOMAINS.map((d) => {
      const rows: SectionRow[] = SECTIONS.filter((s) => s.domain === d.id).map((s) => {
        const count = counts.get(s.id) ?? 0;
        return {
          id: s.id,
          title: s.en,
          count,
          target: s.target,
          percent: Math.min(100, Math.round((count / s.target) * 100)),
        };
      });
      return {
        id: d.id,
        name: d.name,
        weight: `${d.weight[0]}-${d.weight[1]}%`,
        count: rows.reduce((sum, r) => sum + r.count, 0),
        rows,
      };
    });
  });

  constructor() {
    void this.bank.loadAll();
  }
}
