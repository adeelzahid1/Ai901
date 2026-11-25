import { ChangeDetectionStrategy, Component, PendingTasks, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Language } from '../../core/language';
import { NoteProgress } from '../../core/note-progress';
import { Note, loadNote } from '../../data/notes';
import { FlowDiagram } from './flow-diagram';

/** The detailed note of one official skill. */
@Component({
  selector: 'app-note-view',
  imports: [RouterLink, FlowDiagram],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-view.html',
  styleUrl: './note-view.css',
})
export class NoteView {
  protected readonly language = inject(Language);
  protected readonly progress = inject(NoteProgress);

  /** Skill id, e.g. genai-how. */
  readonly skill = input.required<string>();
  /** Study section of the skill, e.g. 1.2. */
  readonly section = input.required<string>();

  private readonly loaded = signal<Note | null>(null);
  protected readonly note = computed(() => (this.loaded()?.id === this.skill() ? this.loaded() : null));

  constructor() {
    const pending = inject(PendingTasks);
    effect(() => {
      const id = this.skill();
      pending.run(async () => {
        const note = await loadNote(id);
        if (this.skill() === id) this.loaded.set(note);
      });
    });
  }
}
