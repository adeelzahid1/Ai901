import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { ProgressService } from '../../core/progress';
import { AreaStats, areaStats } from '../../core/stats';
import { QuestionBank } from '../../data/question-bank';
import { DOMAINS, SECTIONS } from '../../data/schema';
import { ReadinessCard } from '../../shared/readiness-card/readiness-card';

/** Fewer attempts than this are not enough to call an area weak or strong. */
export const MIN_ATTEMPTS = 3;

interface Row {
  id: string;
  label: string;
  sectionId: string;
  /** Skill id of a sub-skill row. */
  skill?: string;
  stats: AreaStats;
}

const EMPTY: AreaStats = { total: 0, seen: 0, attempts: 0, correct: 0, mistakes: 0, accuracy: null, coverage: 0 };

/** Weakest first; areas without enough attempts go last. */
function byWeakness(a: Row, b: Row): number {
  const ea = a.stats.attempts >= MIN_ATTEMPTS;
  const eb = b.stats.attempts >= MIN_ATTEMPTS;
  if (ea !== eb) return ea ? -1 : 1;
  return (a.stats.accuracy ?? 101) - (b.stats.accuracy ?? 101) || b.stats.mistakes - a.stats.mistakes;
}

@Component({
  selector: 'app-weak-areas',
  imports: [RouterLink, ReadinessCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weak-areas.html',
  styleUrl: './weak-areas.css',
})
export class WeakAreas {
  protected readonly language = inject(Language);
  private readonly bank = inject(QuestionBank);
  private readonly progress = inject(ProgressService);

  protected readonly minAttempts = MIN_ATTEMPTS;
  protected readonly attempts = computed(() => this.progress.totals().attempts);
  protected readonly confirmReset = signal(false);

  protected readonly domains = computed(() => {
    const m = areaStats(this.bank.questions(), this.progress.stats(), 'domain');
    return DOMAINS.map((d) => ({ id: d.id, label: this.language.domain(d), weight: d.weight, stats: m.get(d.id) ?? EMPTY }));
  });

  protected readonly sections = computed(() => {
    const m = areaStats(this.bank.questions(), this.progress.stats(), 'section');
    return SECTIONS.map<Row>((s) => ({ id: s.id, label: this.language.section(s), sectionId: s.id, stats: m.get(s.id) ?? EMPTY })).sort(byWeakness);
  });

  protected readonly subs = computed(() => {
    const m = areaStats(this.bank.questions(), this.progress.stats(), 'sub');
    return SECTIONS.flatMap((s) => {
      const domain = DOMAINS.find((d) => d.id === s.domain);
      return s.subs.map<Row>((id) => {
        const sub = domain?.subs.find((x) => x.id === id);
        return {
          id: `${s.domain}|${id}`,
          label: sub ? this.language.sub(sub) : id,
          sectionId: s.id,
          skill: id,
          stats: m.get(`${s.domain}|${id}`) ?? EMPTY,
        };
      });
    }).sort(byWeakness);
  });

  protected readonly focus = computed(() =>
    this.sections().filter((r) => r.stats.attempts >= MIN_ATTEMPTS && (r.stats.accuracy ?? 100) < 70).slice(0, 3),
  );

  constructor() {
    void this.bank.loadAll();
  }

  protected level(s: AreaStats): 'ok' | 'bad' | 'mid' | 'none' {
    if (s.attempts < MIN_ATTEMPTS || s.accuracy === null) return 'none';
    return s.accuracy >= 80 ? 'ok' : s.accuracy < 60 ? 'bad' : 'mid';
  }

  protected reset(): void {
    this.progress.reset();
    this.confirmReset.set(false);
  }
}
