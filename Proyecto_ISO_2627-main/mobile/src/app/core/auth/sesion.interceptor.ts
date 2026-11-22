import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Peticiones que pueden devolver 401 sin que signifique que la sesión ha caducado. */
const RUTAS_SIN_SESION = ['/usuarios/login', '/usuarios/sesion-actual', '/usuarios/csrf', '/usuarios/logout'];

/**
 * Si el backend responde 401 en cualquier pantalla (sesión caducada o cuenta bloqueada),
 * se vuelve al login con un aviso, igual que hace la web.
 */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !RUTAS_SIN_SESION.some((ruta) => req.url.includes(ruta)) &&
        !router.url.startsWith('/login')
      ) {
        router.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' }, replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
