import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** La app móvil es solo para clientes: sin sesión de cliente, se vuelve al login. */
export const clienteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.obtenerSesionActual().pipe(
    map((sesion) => (sesion.role === 'CLIENTE' ? true : router.parseUrl('/login'))),
    catchError(() => of(router.parseUrl('/login')))
  );
};
