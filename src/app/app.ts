import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EXAM } from './data/schema';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">{{ exam.code }} <span>Prep</span></a>
      <nav aria-label="Main">
        @for (item of nav; track item.path) {
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
  protected readonly nav: NavItem[] = [
    { path: '/', label: 'Dashboard', exact: true },
    { path: '/study', label: 'Study' },
    { path: '/practice', label: 'Practice' },
    { path: '/mock', label: 'Mock Test' },
    { path: '/exam', label: 'Exam' },
    { path: '/weak-areas', label: 'Weak areas' },
  ];
}
