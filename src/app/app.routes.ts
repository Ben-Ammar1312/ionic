import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { responderGuard } from './guards/responder.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/giver/alert-giver.page').then((m) => m.AlertGiverPage),
  },
  {
    path: 'respond',
    canActivate: [authGuard, responderGuard],
    loadComponent: () => import('./pages/responder/responder.page').then((m) => m.ResponderPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
