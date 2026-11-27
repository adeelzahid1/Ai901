import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LessonText } from '../../data/lessons';
import { DOMAINS, ExamInfo, StudySection } from '../../data/schema';
import { BilingualText, SheetLang } from './bilingual-text';

export interface BlueprintDomain {
  id: string;
  weight: [number, number];
  title: LessonText;
  sections: StudySection[];
}

/** Exam header banner, domain blueprint and key numbers for screen and A4 print. */
@Component({
  selector: 'app-cheat-overview',
  imports: [BilingualText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="print-banner">
      <div class="banner-top">
        <div>
          <h2>{{ exam().code }}: {{ exam().title }} — Cheat Sheet</h2>
          <p class="banner-sub">
            <app-bilingual-text [text]="{ en: 'Last review before the exam', ro: 'Exam se pehle aakhri dohrayi' }" [mode]="lang()" [inline]="true" />
          </p>
        </div>
        <span class="chip lang-pill">
          <app-bilingual-text [text]="langLabel()" [mode]="lang()" [inline]="true" />
        </span>
      </div>
      <div class="banner-meta">
        @for (m of meta(); track $index) {
          <span>{{ m }}</span>
        }
      </div>
    </header>

    @if (show() && (domains().length || numbers().length)) {
      <section>
        @if (domains().length) {
          <h2>
            <app-bilingual-text [text]="{ en: 'Exam blueprint', ro: 'Exam ka blueprint' }" [mode]="lang()" [inline]="true" />
          </h2>
          <div class="blueprint-grid">
            @for (d of domains(); track d.id) {
              <article class="block">
                <h3>
                  <span class="badge" [class.d2]="d.id === 'D2'">{{ d.id }} ({{ d.weight[0] }}–{{ d.weight[1] }}%)</span>
                  <app-bilingual-text [text]="d.title" [mode]="lang()" [inline]="true" />
                </h3>
                <ul class="plain sec-list">
                  @for (sec of d.sections; track sec.id) {
                    <li>
                      <span class="sec-id">{{ sec.id }}</span>
                      <app-bilingual-text [text]="{ en: sec.en, ro: sec.ro }" [mode]="lang()" />
                    </li>
                  }
                </ul>
              </article>
            }
          </div>
        }

        @if (numbers().length) {
          <h2 class="sub-heading">
            <app-bilingual-text [text]="{ en: 'Key numbers & dates', ro: 'Aham numbers aur tareekhein' }" [mode]="lang()" [inline]="true" />
          </h2>
          <dl class="numbers">
            @for (n of numbers(); track n.value) {
              <div>
                <dt>{{ n.value }}</dt>
                <dd><app-bilingual-text [text]="n.label" [mode]="lang()" /></dd>
              </div>
            }
          </dl>
        }
      </section>
    }
  `,
  styles: `
    .print-banner {
      margin-top: 20px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .banner-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px 16px;
    }
    .print-banner h2 {
      margin: 0 0 2px;
      font-size: 1.15rem;
    }
    .banner-sub {
      margin: 0;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .banner-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--muted);
    }
    .lang-pill {
      font-weight: 600;
    }
    section {
      margin-top: 28px;
    }
    section > h2 {
      padding-bottom: 6px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 12px;
    }
    .sub-heading {
      margin-top: 20px;
    }
    .blueprint-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
      gap: 14px;
    }
    .block {
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      break-inside: avoid;
    }
    .block h3 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 0 0 10px;
      font-size: 0.98rem;
    }
    .badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--accent-soft);
      color: var(--accent);
    }
    .badge.d2 {
      background: var(--ok-soft);
      color: var(--ok);
    }
    .sec-list {
      display: grid;
      gap: 6px;
    }
    .sec-list li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      margin: 0;
      font-size: 0.9rem;
    }
    .sec-id,
    .numbers dt {
      font-weight: 700;
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }
    .numbers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 165px), 1fr));
      gap: 10px;
      margin: 0;
    }
    .numbers > div {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      break-inside: avoid;
    }
    .numbers dt {
      font-size: 1.05rem;
    }
    .numbers dd {
      margin: 3px 0 0;
      font-size: 0.84rem;
    }
    @media print {
      .print-banner,
      .badge {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-banner {
        margin-top: 0;
        padding: 6pt 8pt;
        border-color: #94a3b8;
        border-left: 3pt solid #1d4ed8;
        border-radius: 3pt;
      }
      .print-banner h2 {
        font-size: 12pt;
        border: 0;
        margin: 0 0 2pt;
        padding: 0;
      }
      .banner-sub {
        font-size: 8pt;
        color: #374151;
      }
      .banner-meta {
        margin-top: 4pt;
        padding-top: 4pt;
        border-top-color: #cbd5e1;
        font-size: 7.5pt;
        color: #1f2937;
      }
      section {
        margin-top: 10pt;
      }
      section > h2 {
        margin: 0 0 5pt;
        padding-bottom: 2pt;
        border-bottom: 1.2pt solid #111827;
        font-size: 10.5pt;
        break-after: avoid;
      }
      .sub-heading {
        margin-top: 8pt;
      }
      .blueprint-grid {
        grid-template-columns: 1fr 1fr;
        gap: 6pt;
      }
      .block {
        padding: 5pt 6pt;
        border-color: #cbd5e1;
        border-radius: 3pt;
      }
      .block h3 {
        margin: 0 0 4pt;
        font-size: 8.4pt;
        gap: 3pt;
      }
      .badge {
        padding: 0.5pt 3.5pt;
        border-radius: 2pt;
        font-size: 6.4pt;
        background: #dbeafe;
        color: #1e40af;
      }
      .badge.d2 {
        background: #dcfce7;
        color: #166534;
      }
      .sec-list {
        gap: 2.5pt;
      }
      .sec-list li {
        gap: 4pt;
        font-size: 7.3pt;
      }
      .sec-id {
        color: #1d4ed8;
      }
      .numbers {
        grid-template-columns: repeat(4, 1fr);
        gap: 4pt;
      }
      .numbers > div {
        padding: 3pt 5pt;
        border-color: #cbd5e1;
        border-radius: 3pt;
      }
      .numbers dt {
        font-size: 8.5pt;
        color: #111827;
      }
      .numbers dd {
        margin-top: 1pt;
        font-size: 6.9pt;
      }
    }
  `,
})
export class CheatOverview {
  readonly exam = input.required<ExamInfo>();
  readonly lang = input.required<SheetLang>();
  readonly langLabel = input.required<LessonText>();
  readonly show = input.required<boolean>();
  readonly domains = input.required<BlueprintDomain[]>();
  readonly numbers = input.required<{ value: string; label: LessonText }[]>();

  /** Facts of the banner in the sheet language; English when both are shown. */
  protected readonly meta = computed(() => {
    const e = this.exam();
    const ro = this.lang() === 'ro';
    const weights = DOMAINS.map((d) => `${d.id}: ${d.weight[0]}–${d.weight[1]}%`).join(' · ');
    return ro
      ? [`Skills outline ${e.outlineDate}`, `${e.minutes} minute · taqreeban ${e.examQuestions} sawal`, `Pass ${e.passScore}/${e.maxScore}`, weights, `${e.checked} ko Microsoft Learn se milaya`]
      : [`Skills outline ${e.outlineDate}`, `${e.minutes} min · about ${e.examQuestions} questions`, `Pass ${e.passScore}/${e.maxScore}`, weights, `Compared with Microsoft Learn on ${e.checked}`];
  });
}
