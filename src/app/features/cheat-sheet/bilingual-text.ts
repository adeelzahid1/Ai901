import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LessonText } from '../../data/lessons';

export type SheetLang = 'both' | 'en' | 'ro';

/** Renders English, Roman Urdu, or both cleanly without duplicating identical strings. */
@Component({
  selector: 'app-bilingual-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pair(); as p) {
      @if (inline()) {
        <span class="bi-inline">
          <span lang="en">{{ p.en }}</span>
          <span class="bi-sep" aria-hidden="true"> · </span>
          <span class="bi-ro-inline" lang="ur-Latn">{{ p.ro }}</span>
        </span>
      } @else {
        <span class="bi">
          <span class="bi-en" lang="en">{{ p.en }}</span>
          <span class="bi-ro" lang="ur-Latn">{{ p.ro }}</span>
        </span>
      }
    } @else {
      <span [attr.lang]="singleLang()">{{ single() }}</span>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .bi {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bi-en {
      color: var(--text);
    }
    .bi-ro {
      color: var(--muted);
      font-size: 0.88em;
      line-height: 1.38;
      padding-left: 7px;
      border-left: 2px solid var(--accent-soft);
    }
    .bi-sep {
      color: var(--muted);
    }
    .bi-ro-inline {
      color: var(--muted);
      font-weight: 500;
    }
    @media print {
      .bi {
        gap: 1pt;
      }
      .bi-en {
        color: #111827;
      }
      .bi-ro {
        color: #374151;
        font-size: 0.86em;
        line-height: 1.25;
        padding-left: 4pt;
        border-left: 1.5pt solid #cbd5e1;
      }
      .bi-ro-inline {
        color: #374151;
      }
    }
  `,
})
export class BilingualText {
  readonly text = input.required<LessonText>();
  readonly mode = input<SheetLang>('both');
  readonly inline = input(false);

  protected readonly pair = computed(() => {
    const t = this.text();
    if (this.mode() !== 'both' || typeof t === 'string' || t.en === t.ro) return null;
    return t;
  });

  protected readonly single = computed(() => {
    const t = this.text();
    if (typeof t === 'string') return t;
    return this.mode() === 'ro' ? t.ro : t.en;
  });

  protected readonly singleLang = computed(() => {
    if (typeof this.text() === 'string') return 'en';
    return this.mode() === 'ro' ? 'ur-Latn' : 'en';
  });
}
