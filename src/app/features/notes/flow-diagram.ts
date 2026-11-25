import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Language } from '../../core/language';
import { LessonText } from '../../data/lessons';
import { FlowStep } from '../../data/notes';

/** Boxes with arrows: side by side on wide screens, top-down on phones. */
@Component({
  selector: 'app-flow-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <figcaption>{{ language.pick(title()) }}</figcaption>
      <ol>
        @for (step of steps(); track $index) {
          <li>
            <strong>{{ language.pick(step.title) }}</strong>
            @if (step.text) {
              <span>{{ language.pick(step.text) }}</span>
            }
          </li>
        }
      </ol>
    </figure>
  `,
  styles: `
    figure {
      margin: 20px 0 4px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    figcaption {
      margin-bottom: 10px;
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 600;
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 30px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      position: relative;
      display: flex;
      flex: 1 1 108px;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--accent);
      border-radius: 8px;
      background: var(--accent-soft);
      text-align: center;
    }
    li span {
      color: var(--muted);
      font-size: 0.85rem;
    }
    li:not(:last-child)::after {
      position: absolute;
      top: 50%;
      left: 100%;
      width: 30px;
      color: var(--accent);
      font-weight: 700;
      text-align: center;
      transform: translateY(-50%);
      content: '→' / '';
    }
    @media (max-width: 700px) {
      ol {
        flex-direction: column;
        gap: 26px;
      }
      li {
        flex: none;
      }
      li:not(:last-child)::after {
        top: 100%;
        left: 0;
        width: 100%;
        line-height: 26px;
        transform: none;
        content: '↓' / '';
      }
    }
  `,
})
export class FlowDiagram {
  protected readonly language = inject(Language);

  readonly title = input.required<LessonText>();
  readonly steps = input.required<FlowStep[]>();
}
