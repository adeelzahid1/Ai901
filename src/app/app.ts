import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Language } from './core/language';
import { EXAM } from './data/schema';
import { LanguageToggle } from './shared/language-toggle/language-toggle';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LanguageToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">{{ exam.code }} <span>Prep</span></a>
      <app-language-toggle />
      <nav [attr.aria-label]="language.ui().nav.main">
        @for (item of nav(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
            ariaCurrentWhenActive="page"
            >{{ item.label }}</a
          >
        }
      </nav>
    </header>
    <main class="page">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 8px 24px;
      flex-wrap: wrap;
      padding: 10px var(--pad-x);
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .brand {
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--text);
      text-decoration: none;
      white-space: nowrap;
    }
    .brand span {
      color: var(--accent);
    }
    app-language-toggle {
      order: 3;
      margin-left: auto;
    }
    @media (max-width: 860px) {
      /* Brand and language share the first line; the tabs get their own. */
      app-language-toggle {
        order: 0;
      }
      nav {
        flex-basis: 100%;
      }
    }
    nav {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      max-width: 100%;
      scrollbar-width: none;
    }
    nav a {
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-weight: 600;
      white-space: nowrap;
    }
    nav a:hover {
      color: var(--text);
    }
    nav a.active {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .page {
      padding: 24px var(--pad-x) 48px;
    }
  `,
})
export class App {
  protected readonly exam = EXAM;
  protected readonly language = inject(Language);
  protected readonly nav = computed<NavItem[]>(() => {
    const t = this.language.ui().nav;
    return [
      { path: '/', label: t.dashboard, exact: true },
      { path: '/study', label: t.study },
      { path: '/labs', label: t.labs },
      { path: '/practice', label: t.practice },
      { path: '/mock', label: t.mock },
      { path: '/exam', label: t.exam },
      { path: '/weak-areas', label: t.weak },
    ];
  });
}
