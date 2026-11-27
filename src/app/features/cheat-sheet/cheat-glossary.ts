import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { GlossaryEntry } from '../../data/notes';
import { StudySection } from '../../data/schema';
import { BilingualText, SheetLang } from './bilingual-text';

export interface SheetGlossaryEntry extends GlossaryEntry {
  section?: StudySection;
}

/** Optional A–Z glossary section of the cheat sheet. */
@Component({
  selector: 'app-cheat-glossary',
  imports: [BilingualText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h2>
        <app-bilingual-text [text]="{ en: 'Exam glossary', ro: 'Exam ki istilahat (Glossary)' }" [mode]="lang()" [inline]="true" />
        <span class="chip count-chip">{{ entries().length }}</span>
      </h2>
      <dl class="glossary-grid">
        @for (g of entries(); track g.term) {
          <div class="glossary-item">
            <dt>
              <span>{{ g.term }}</span>
              @if (g.section) {
                <span class="sec-tag">{{ g.section.id }}</span>
              }
            </dt>
            <dd><app-bilingual-text [text]="{ en: g.en, ro: g.ro }" [mode]="lang()" /></dd>
          </div>
        }
      </dl>
    </section>
  `,
  styles: `
    section {
      margin-top: 28px;
    }
    section > h2 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 12px;
    }
    .count-chip {
      font-size: 0.78rem;
    }
    .glossary-grid {
      columns: 2 380px;
      column-gap: 16px;
      margin: 0;
    }
    .glossary-item {
      margin: 0 0 8px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      break-inside: avoid;
    }
    .glossary-item dt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      margin-bottom: 2px;
    }
    .glossary-item dd {
      margin: 0;
      font-size: 0.87rem;
    }
    .sec-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--muted);
    }
    @media print {
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
      .glossary-grid {
        columns: 2;
        column-gap: 8pt;
      }
      .glossary-item {
        margin-bottom: 4pt;
        padding: 3pt 5pt;
        border-color: #cbd5e1;
        border-radius: 3pt;
      }
      .glossary-item dt {
        font-size: 7.5pt;
        margin-bottom: 0.5pt;
      }
      .glossary-item dd {
        font-size: 7pt;
      }
    }
  `,
})
export class CheatGlossary {
  readonly entries = input.required<SheetGlossaryEntry[]>();
  readonly lang = input.required<SheetLang>();
}
