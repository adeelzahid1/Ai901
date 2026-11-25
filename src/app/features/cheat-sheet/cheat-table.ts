import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Language } from '../../core/language';
import { LessonText } from '../../data/lessons';

/** A small text table of the cheat sheet. */
@Component({
  selector: 'app-cheat-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table>
      <thead>
        <tr>
          @for (h of head(); track $index) {
            <th scope="col">{{ language.pick(h) }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @for (cell of row; track $index) {
              <td>{{ language.pick(cell) }}</td>
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
      font-size: 0.92rem;
    }
    th,
    td {
      padding: 5px 8px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    /* Whole words in the first column; long names in the others may break. */
    th,
    td:first-child {
      overflow-wrap: break-word;
    }
    th {
      color: var(--muted);
      font-size: 0.8rem;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    @media print {
      table {
        font-size: 7.5pt;
      }
      th,
      td {
        padding: 1.5pt 3pt;
      }
      th {
        font-size: 7pt;
      }
    }
  `,
})
export class CheatTable {
  protected readonly language = inject(Language);

  readonly head = input.required<LessonText[]>();
  readonly rows = input.required<LessonText[][]>();
}
