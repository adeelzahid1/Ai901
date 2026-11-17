import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/** localStorage access that is safe during server rendering and in private browsing. */
@Injectable({ providedIn: 'root' })
export class LocalStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  read<T>(key: string, fallback: T): T {
    if (!this.browser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  write(key: string, value: unknown): void {
    if (!this.browser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: progress simply is not saved.
    }
  }

  remove(key: string): void {
    if (!this.browser) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
