import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { Language } from '../../core/language';
import { ShortcutSettings } from '../../core/shortcut-settings';
import { ShortcutRow } from '../../core/shortcuts';

/** Collapsible list of keyboard shortcuts with a switch to turn them off. Hidden on touch screens. */
@Component({
  selector: 'app-shortcut-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().keys;
    <details #panel class="card" [open]="open()" (toggle)="open.set(panel.open)">
      <summary>{{ t.heading }}</summary>
      <dl>
        @for (row of rows(); track row.text) {
          <div>
            <dt>
              @for (key of row.keys; track key) {
                <kbd>{{ key }}</kbd>
              }
            </dt>
            <dd>{{ row.text }}</dd>
          </div>
        }
      </dl>
      <label>
        <input #on type="checkbox" [checked]="settings.enabled()" (change)="settings.setEnabled(on.checked)" />
        {{ t.enabled }}
      </label>
    </details>
  `,
  styles: `
    :host {
      display: block;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 8px 24px;
      margin: 12px 0;
    }
    dl div {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    dt {
      display: flex;
      flex: 0 0 auto;
      gap: 4px;
    }
    dd {
      margin: 0;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    @media (hover: none) and (pointer: coarse) {
      :host {
        display: none;
      }
    }
  `,
})
export class ShortcutHelp {
  protected readonly language = inject(Language);
  protected readonly settings = inject(ShortcutSettings);

  readonly rows = input.required<ShortcutRow[]>();
  readonly open = model(false);
}
