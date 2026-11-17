import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Placeholder until the Study page (sections, flashcards, spaced repetition) is built in Phase 3. */
@Component({
  selector: 'app-study',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Study</h1>
    <div class="card">
      <p>
        The Study page with sections 1.1-2.7, flashcards and spaced repetition is coming next. Until then you can
        practice any section.
      </p>
      <a class="btn primary" routerLink="/practice">Go to Practice</a>
    </div>
  `,
})
export class Study {}
