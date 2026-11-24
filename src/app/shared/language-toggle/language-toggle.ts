import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Language } from '../../core/language';

/** EN | Roman switch for the top bar. */
@Component({
  selector: 'app-language-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'language.ui().nav.language' },
  template: `
    <button type="button" lang="en" [class.on]="!language.roman()" [attr.aria-pressed]="!language.roman()" (click)="language.set('en')">EN</button>
    <button type="button" lang="ur-Latn" [class.on]="language.roman()" [attr.aria-pressed]="language.roman()" (click)="language.set('ro')">Roman</button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    button {
      padding: 5px 10px;
      border: 0;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    button + button {
      border-left: 1px solid var(--border);
    }
    button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }
    button.on {
      background: var(--accent-soft);
      color: var(--accent);
    }
  `,
})
export class LanguageToggle {
  protected readonly language = inject(Language);
}
