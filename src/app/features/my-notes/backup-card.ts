import { DOCUMENT, DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { Backup, ImportMode, UNDO_KEY, backupFileName, importBackup, makeBackup, parseBackup, summarize, undoImport } from '../../core/backup';
import { Language } from '../../core/language';

/** Saves everything in one file and loads such a file in this or another browser. */
@Component({
  selector: 'app-backup-card',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = language.ui().backup;
    <section class="card">
      <h2>{{ t.heading }}</h2>
      <p>{{ t.lead }}</p>
      <div class="row">
        <button type="button" class="btn primary" (click)="download()">{{ t.save }}</button>
        <label class="btn">
          {{ t.load }}
          <input #file class="sr" type="file" accept="application/json,.json" (change)="choose(file)" />
        </label>
        @if (canUndo()) {
          <button type="button" class="btn" (click)="undo()">{{ t.undo }}</button>
        }
      </div>
      @if (error()) {
        <p class="error" role="alert">{{ t.invalid }}</p>
      }
      @if (found(); as f) {
        <div class="found" role="status">
          <p>
            <strong>{{ t.from((f.backup.at | date: 'medium') ?? f.backup.at) }}</strong>
            {{ t.content(f.summary.answered, f.summary.exams, f.summary.understood, f.summary.lessons, f.summary.notesRead, f.summary.ownNotes) }}
          </p>
          <div class="row">
            <button type="button" class="btn primary" (click)="load('merge')">{{ t.merge }}</button>
            <button type="button" class="btn" (click)="load('replace')">{{ t.replace }}</button>
            <button type="button" class="btn" (click)="found.set(null)">{{ t.cancel }}</button>
          </div>
          <p class="muted">{{ t.explain }}</p>
        </div>
      }
      <p class="muted">{{ t.privacy }}</p>
    </section>
  `,
  styles: `
    h2,
    p {
      margin: 0 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    label.btn {
      position: relative;
    }
    label.btn:focus-within {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .error {
      color: var(--bad);
      font-weight: 600;
    }
    .found {
      margin: 8px 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--surface-2);
    }
  `,
})
export class BackupCard {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly language = inject(Language);

  protected readonly found = signal<{ backup: Backup; summary: ReturnType<typeof summarize> } | null>(null);
  protected readonly error = signal(false);
  protected readonly canUndo = signal(this.browser && localStorage.getItem(UNDO_KEY) !== null);

  protected download(): void {
    const blob = new Blob([JSON.stringify(makeBackup(localStorage), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    // The download has started by then; the address is not needed any more.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  protected async choose(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const backup = parseBackup(await file.text());
    this.error.set(!backup);
    this.found.set(backup ? { backup, summary: summarize(backup.data) } : null);
  }

  protected load(mode: ImportMode): void {
    const found = this.found();
    if (!found) return;
    importBackup(localStorage, found.backup, mode);
    this.reload();
  }

  protected undo(): void {
    if (undoImport(localStorage)) this.reload();
  }

  /** The services read the saved data when the app starts. */
  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}
