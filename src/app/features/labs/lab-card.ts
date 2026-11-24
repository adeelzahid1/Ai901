import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LabProgress } from '../../core/lab-progress';
import { Language } from '../../core/language';
import { Lab } from '../../data/labs';

/** One lab: goal, cost, steps to tick off, checks and clean-up. */
@Component({
  selector: 'app-lab-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().labs;
    @let l = lab();
    <details class="card" [id]="l.id" [open]="open()">
      <summary>
        <span class="n">{{ number() }}</span>
        <span class="title">{{ language.pick(l.title) }}</span>
        <span class="chip">{{ l.sections.join(', ') }}</span>
        <span class="chip">{{ t.minutes(l.minutes) }}</span>
        <span class="chip" [class.done]="finished()">{{ t.progress(progress.count(l.id), l.steps.length) }}</span>
      </summary>
      <p>{{ language.pick(l.goal) }}</p>
      <p class="cost"><strong>{{ t.cost }}</strong> {{ language.pick(l.cost) }}</p>
      <h3>{{ t.steps }}</h3>
      <ol>
        @for (step of l.steps; track $index; let i = $index) {
          <li [class.ticked]="progress.isDone(l.id, i)">
            <label>
              <input type="checkbox" [checked]="progress.isDone(l.id, i)" (change)="progress.toggle(l.id, i)" />
              <span>{{ language.pick(step) }}</span>
            </label>
            @if (step.code) {
              <pre class="code" tabindex="0">{{ step.code }}</pre>
            }
          </li>
        }
      </ol>
      <h3>{{ t.check }}</h3>
      <ul>
        @for (c of l.check; track $index) {
          <li>{{ language.pick(c) }}</li>
        }
      </ul>
      <h3>{{ t.clean }}</h3>
      <p>{{ language.pick(l.clean) }}</p>
      @if (l.clean.code) {
        <pre class="code" tabindex="0">{{ l.clean.code }}</pre>
      }
      <p><a [href]="l.ref" target="_blank" rel="noopener">{{ language.ui().common.learn }}</a></p>
    </details>
  `,
  styles: `
    summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 10px;
      cursor: pointer;
    }
    .n {
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 99px;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
      text-align: center;
      line-height: 28px;
    }
    .title {
      flex: 1 1 200px;
      font-weight: 600;
    }
    .chip.done {
      background: var(--ok-soft);
      border-color: var(--ok);
      color: var(--ok);
    }
    h3 {
      margin: 18px 0 6px;
      font-size: 1rem;
    }
    ol,
    ul {
      margin: 0;
      padding-left: 22px;
    }
    li {
      margin: 8px 0;
    }
    li label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }
    li input {
      flex: none;
      margin-top: 5px;
    }
    .ticked label span {
      color: var(--muted);
    }
    pre.code {
      margin: 8px 0;
      white-space: pre;
      overflow-wrap: normal;
    }
    .cost {
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--surface-2);
    }
  `,
})
export class LabCard {
  protected readonly language = inject(Language);
  protected readonly progress = inject(LabProgress);

  readonly lab = input.required<Lab>();
  readonly number = input.required<number>();
  readonly open = input(false);

  protected readonly finished = computed(() => this.progress.count(this.lab().id) === this.lab().steps.length);
}
