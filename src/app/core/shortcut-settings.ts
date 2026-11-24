import { Injectable, inject, signal } from '@angular/core';
import { LocalStore } from './storage';

const KEY = 'ai901-keys';

/** Whether single-key shortcuts are on. They can be turned off because they can clash with assistive technology. */
@Injectable({ providedIn: 'root' })
export class ShortcutSettings {
  private readonly store = inject(LocalStore);
  private readonly on = signal(this.store.read<unknown>(KEY, true) !== false);

  readonly enabled = this.on.asReadonly();

  setEnabled(enabled: boolean): void {
    this.on.set(enabled);
    this.store.write(KEY, enabled);
  }
}
