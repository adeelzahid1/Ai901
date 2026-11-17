import { Injectable, signal } from '@angular/core';
import { QuizReport } from './report';

/** Keeps the last finished session in memory so the Results page can show and review it. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly lastReport = signal<QuizReport | null>(null);

  setReport(report: QuizReport): void {
    this.lastReport.set(report);
  }
}
