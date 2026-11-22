import { Routes } from '@angular/router';
import { clienteGuard } from './core/auth/cliente.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'inicio',
    canActivate: [clienteGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage)
  },
  { path: '**', redirectTo: 'inicio' }
];
