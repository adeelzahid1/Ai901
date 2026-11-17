import { RenderMode, ServerRoute } from '@angular/ssr';

/** Only the landing page is prerendered; every other route renders on the client. */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
