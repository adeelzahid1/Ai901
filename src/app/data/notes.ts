import { LessonText } from './lessons';

/** A step of a simple left-to-right (or top-down) diagram. */
export interface FlowStep {
  title: LessonText;
  text?: LessonText;
}

/** The detailed note of one official skill. */
export interface Note {
  /** Skill id from the blueprint, e.g. genai-how. */
  id: string;
  minutes: number;
  main: LessonText;
  explain: LessonText[];
  flow?: { title: LessonText; steps: FlowStep[] };
  deep: LessonText[];
  how: LessonText[];
  example: { text: LessonText; code?: string };
  mistakes: { wrong: LessonText; right: LessonText }[];
  compare: { terms: LessonText; text: LessonText }[];
  exam: LessonText[];
  refs: string[];
}

export interface GlossaryEntry {
  term: string;
  /** Skill id of the note that explains the term. */
  note: string;
  en: string;
  ro: string;
}

/** Short titles, so the list of notes needs no note file. */
export const NOTE_TITLES: Record<string, LessonText> = {
  fairness: { en: 'Fairness', ro: 'Fairness (insaaf)' },
  'reliability-safety': { en: 'Reliability and safety', ro: 'Reliability and safety (bharosa aur hifazat)' },
  'privacy-security': { en: 'Privacy and security', ro: 'Privacy and security (raazdari aur security)' },
  inclusiveness: { en: 'Inclusiveness', ro: 'Inclusiveness (sab ki shamooliat)' },
  transparency: { en: 'Transparency', ro: 'Transparency (shaffafiat)' },
  accountability: { en: 'Accountability', ro: 'Accountability (jawabdehi)' },
  'genai-how': { en: 'How generative models work', ro: 'Generative models kaise kaam karte hain' },
  'model-choice': { en: 'Choosing a model', ro: 'Model ka intikhab' },
  'deploy-config': { en: 'Deployment types and parameters', ro: 'Deployment types aur parameters' },
  'workload-scenarios': 'AI workloads',
  'text-techniques': { en: 'Text analysis techniques', ro: 'Text analysis ke tareeqay' },
  'speech-features': { en: 'Speech recognition and synthesis', ro: 'Awaaz pehchanna aur banana' },
  'vision-imagegen': { en: 'Computer vision and image generation', ro: 'Computer vision aur image generation' },
  'extraction-techniques': { en: 'Information extraction', ro: 'Maloomat nikalna' },
  prompts: { en: 'System and user prompts', ro: 'System aur user prompts' },
  'portal-deploy': { en: 'Deploy and test in the portal', ro: 'Portal mein deploy aur test' },
  'sdk-chat-client': { en: 'Chat client with the SDK', ro: 'SDK se chat client' },
  'agent-portal': { en: 'Build and test an agent', ro: 'Agent banana aur test karna' },
  'agent-client': { en: 'Client app for an agent', ro: 'Agent ki client app' },
  'text-app': { en: 'Text analysis app', ro: 'Text analysis ki app' },
  'spoken-prompts': { en: 'Spoken prompts', ro: 'Bole gaye prompts' },
  'speech-app': { en: 'App with Azure Speech', ro: 'Azure Speech ki app' },
  'visual-input': { en: 'Images in prompts', ro: 'Prompts mein images' },
  'image-generation': { en: 'Create images', ro: 'Images banana' },
  'vision-app': { en: 'Vision app', ro: 'Vision ki app' },
  'cu-documents': { en: 'Documents and forms', ro: 'Documents aur forms' },
  'cu-images': { en: 'Fields from images', ro: 'Images se fields' },
  'cu-audio-video': { en: 'Fields from audio and video', ro: 'Audio aur video se fields' },
  'cu-app': { en: 'Content Understanding app', ro: 'Content Understanding ki app' },
};

const LOADERS: Record<string, () => Promise<Note>> = {
  fairness: () => import('./notes/fairness.json').then((m) => m.default),
  'reliability-safety': () => import('./notes/reliability-safety.json').then((m) => m.default),
  'privacy-security': () => import('./notes/privacy-security.json').then((m) => m.default),
  inclusiveness: () => import('./notes/inclusiveness.json').then((m) => m.default),
  transparency: () => import('./notes/transparency.json').then((m) => m.default),
  accountability: () => import('./notes/accountability.json').then((m) => m.default),
  'genai-how': () => import('./notes/genai-how.json').then((m) => m.default),
  'model-choice': () => import('./notes/model-choice.json').then((m) => m.default),
  'deploy-config': () => import('./notes/deploy-config.json').then((m) => m.default),
  'workload-scenarios': () => import('./notes/workload-scenarios.json').then((m) => m.default),
  'text-techniques': () => import('./notes/text-techniques.json').then((m) => m.default),
  'speech-features': () => import('./notes/speech-features.json').then((m) => m.default),
  'vision-imagegen': () => import('./notes/vision-imagegen.json').then((m) => m.default),
  'extraction-techniques': () => import('./notes/extraction-techniques.json').then((m) => m.default),
  prompts: () => import('./notes/prompts.json').then((m) => m.default),
  'portal-deploy': () => import('./notes/portal-deploy.json').then((m) => m.default),
  'sdk-chat-client': () => import('./notes/sdk-chat-client.json').then((m) => m.default),
  'agent-portal': () => import('./notes/agent-portal.json').then((m) => m.default),
  'agent-client': () => import('./notes/agent-client.json').then((m) => m.default),
  'text-app': () => import('./notes/text-app.json').then((m) => m.default),
  'spoken-prompts': () => import('./notes/spoken-prompts.json').then((m) => m.default),
  'speech-app': () => import('./notes/speech-app.json').then((m) => m.default),
  'visual-input': () => import('./notes/visual-input.json').then((m) => m.default),
  'image-generation': () => import('./notes/image-generation.json').then((m) => m.default),
  'vision-app': () => import('./notes/vision-app.json').then((m) => m.default),
  'cu-documents': () => import('./notes/cu-documents.json').then((m) => m.default),
  'cu-images': () => import('./notes/cu-images.json').then((m) => m.default),
  'cu-audio-video': () => import('./notes/cu-audio-video.json').then((m) => m.default),
  'cu-app': () => import('./notes/cu-app.json').then((m) => m.default),
};

/** Every note is its own lazy chunk. */
export async function loadNote(skill: string): Promise<Note | null> {
  return (await LOADERS[skill]?.()) ?? null;
}

export async function loadGlossary(): Promise<GlossaryEntry[]> {
  return (await import('./glossary.json')).default;
}
