import { Routes } from '@angular/router';
import { clienteGuard } from './core/auth/cliente.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage)
  },
  {
    // Misma ruta que la web, para que el enlace del correo también funcione aquí.
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./pages/recuperar-contrasena/recuperar-contrasena.page').then((m) => m.RecuperarContrasenaPage)
  },
  {
    path: 'inicio',
    canActivate: [clienteGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage)
  },
  { path: '**', redirectTo: 'inicio' }
];
