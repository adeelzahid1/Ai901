import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Language } from '../../core/language';
import { LessonText } from '../../data/lessons';
import { BilingualText, SheetLang } from './bilingual-text';

/** A compact reference or decision table inside the cheat sheet. */
@Component({
  selector: 'app-cheat-table',
  imports: [BilingualText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.wide]': 'head().length >= 4' },
  template: `
    <table>
      <thead>
        <tr>
          @for (h of head(); track $index) {
            <th scope="col"><app-bilingual-text [text]="h" [mode]="lang()" [inline]="true" /></th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @for (cell of row; track $index) {
              <td><app-bilingual-text [text]="cell" [mode]="lang()" /></td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th,
    td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    th,
    td:first-child {
      overflow-wrap: break-word;
    }
    td:first-child {
      font-weight: 600;
    }
    td:last-child {
      min-width: 78px;
    }
    th {
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: var(--surface-2);
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    /* Four columns do not fit a phone: keep whole words and let the box scroll. */
    :host(.wide) table {
      min-width: 34rem;
    }
    :host(.wide) td {
      overflow-wrap: break-word;
    }
    @media print {
      :host(.wide) table {
        min-width: 0;
      }
      td:last-child {
        min-width: 0;
      }
      table {
        font-size: 7.4pt;
      }
      th,
      td {
        padding: 2pt 3.5pt;
        border-bottom-color: #d1d5db;
      }
      th {
        font-size: 6.8pt;
        color: #374151;
        background: #f3f4f6;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      tr {
        break-inside: avoid;
      }
    }
  `,
})
export class CheatTable {
  protected readonly language = inject(Language);

  readonly head = input.required<LessonText[]>();
  readonly rows = input.required<LessonText[][]>();
  readonly lang = input<SheetLang>('both');
}
