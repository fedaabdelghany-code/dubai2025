import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./sso/sso.page').then((m) => m.SsoPage),
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'venue',
    loadComponent: () =>
      import('./venue/venue.page').then((m) => m.VenuePage),
  },
  {
    path: 'hse-induction',
    loadComponent: () => import('./hse-induction/hse-induction.page').then( m => m.HseInductionPage)
  },

];
