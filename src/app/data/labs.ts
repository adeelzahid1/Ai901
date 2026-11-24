/** Text in both languages of the app. */
export interface Bilingual {
  en: string;
  ro: string;
}

export interface LabStep extends Bilingual {
  /** A prompt, command or program to copy; the same in both languages. */
  code?: string;
}

export interface Lab {
  id: string;
  /** Study sections the lab belongs to, e.g. 2.4. */
  sections: string[];
  minutes: number;
  title: Bilingual;
  goal: Bilingual;
  cost: Bilingual;
  steps: LabStep[];
  /** What the learner should be able to say or see at the end. */
  check: Bilingual[];
  clean: LabStep;
  ref: string;
}

/** Labs are their own lazy chunk. */
export async function loadLabs(): Promise<Lab[]> {
  return (await import('./labs.json')).default;
}
