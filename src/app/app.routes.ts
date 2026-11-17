import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'AI-901 Prep',
    loadComponent: () => import('./features/bank-overview/bank-overview').then((m) => m.BankOverview),
  },
  { path: '**', redirectTo: '' },
];
