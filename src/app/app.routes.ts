import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard · AI-901 Prep',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'study',
    title: 'Study · AI-901 Prep',
    loadComponent: () => import('./features/study/study').then((m) => m.Study),
  },
  {
    path: 'practice',
    title: 'Practice · AI-901 Prep',
    loadComponent: () => import('./features/practice/practice').then((m) => m.Practice),
  },
  {
    path: 'mock',
    title: 'Mock Test · AI-901 Prep',
    loadComponent: () => import('./features/mock-test/mock-test').then((m) => m.MockTest),
  },
  {
    path: 'exam',
    title: 'Exam · AI-901 Prep',
    loadComponent: () => import('./features/exam/exam').then((m) => m.Exam),
  },
  {
    path: 'results',
    title: 'Results · AI-901 Prep',
    loadComponent: () => import('./features/results/results').then((m) => m.Results),
  },
  {
    path: 'weak-areas',
    title: 'Weak areas · AI-901 Prep',
    loadComponent: () => import('./features/weak-areas/weak-areas').then((m) => m.WeakAreas),
  },
  { path: '**', redirectTo: '' },
];
