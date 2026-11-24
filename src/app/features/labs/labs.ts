import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LabProgress } from '../../core/lab-progress';
import { Language } from '../../core/language';
import { Lab, loadLabs } from '../../data/labs';
import { LabCard } from './lab-card';

/** Hands-on labs in the Foundry portal and with the Python SDKs. */
@Component({
  selector: 'app-labs',
  imports: [LabCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().labs;
    <h1>{{ t.heading }}</h1>
    <p class="lead">{{ t.lead }}</p>
    <div class="stack">
      <div class="card">
        <p><strong>{{ t.before }}</strong></p>
        <ul>
          @for (line of t.beforeList; track $index) {
            <li>{{ line }}</li>
          }
        </ul>
        @if (labs().length) {
          <p class="muted">{{ t.finished(finished(), labs().length) }}</p>
        }
      </div>
      @for (lab of labs(); track lab.id; let i = $index) {
        <app-lab-card [lab]="lab" [number]="i + 1" [open]="lab.id === l()" />
      } @empty {
        <p class="muted">{{ language.ui().common.loadingQuestions }}</p>
      }
    </div>
  `,
  styles: `
    ul {
      margin: 0 0 8px;
      padding-left: 22px;
    }
    p {
      margin: 0 0 8px;
    }
  `,
})
export class Labs {
  protected readonly language = inject(Language);
  private readonly progress = inject(LabProgress);

  /** Lab to open, e.g. /labs?l=chat-client */
  readonly l = input<string>();

  protected readonly labs = signal<Lab[]>([]);
  protected readonly finished = computed(
    () => this.labs().filter((lab) => this.progress.count(lab.id) === lab.steps.length).length,
  );

  constructor() {
    void loadLabs().then((labs) => this.labs.set(labs));
  }
}
