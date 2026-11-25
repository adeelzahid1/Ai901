import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStore } from './storage';

export const OWN_NOTES_KEY = 'ai901-own-notes';
export const MAX_NOTE = 4000;

/** Where a note belongs: a question (D1-001), a study section (1.2) or a skill (genai-how). */
export type NoteKind = 'q' | 's' | 'n';
export type NoteKey = `${NoteKind}:${string}`;

export interface OwnNote {
  text: string;
  /** Last change (ms since epoch). */
  at: number;
}

export interface OwnNoteEntry extends OwnNote {
  key: NoteKey;
  kind: NoteKind;
  id: string;
}

/** The learner's own notes, saved in localStorage. An empty note is removed. */
@Injectable({ providedIn: 'root' })
export class OwnNotes {
  private readonly store = inject(LocalStore);
  private readonly state = signal<Record<string, OwnNote>>(this.store.read(OWN_NOTES_KEY, {}));

  readonly count = computed(() => Object.keys(this.state()).length);

  /** All notes, newest first. */
  readonly entries = computed<OwnNoteEntry[]>(() =>
    Object.keys(this.state())
      .map((key) => this.entry(key as NoteKey))
      .sort((a, b) => b.at - a.at),
  );

  /** The note as a list entry; the text is empty when there is none. */
  entry(key: NoteKey): OwnNoteEntry {
    return { ...(this.state()[key] ?? { text: '', at: 0 }), key, kind: key.slice(0, 1) as NoteKind, id: key.slice(2) };
  }

  text(key: NoteKey): string {
    return this.state()[key]?.text ?? '';
  }

  save(key: NoteKey, text: string, at = Date.now()): void {
    const next = text.slice(0, MAX_NOTE);
    if (next.trim() === this.text(key).trim()) return;
    this.state.update((all) => {
      const rest = { ...all };
      delete rest[key];
      return next.trim() ? { ...rest, [key]: { text: next.trim(), at } } : rest;
    });
    this.store.write(OWN_NOTES_KEY, this.state());
  }

  remove(key: NoteKey): void {
    this.save(key, '');
  }
}
