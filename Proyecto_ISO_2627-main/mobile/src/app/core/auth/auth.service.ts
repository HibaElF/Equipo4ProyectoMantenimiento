import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaTokenCsrf } from '../models/respuesta-token-csrf';

export type Rol = 'ADMIN' | 'CLIENTE' | 'VENDEDOR';

export interface RespuestaInicioSesion {
  email: string;
  role: Rol;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string | null;
  requiresTwoFactorSetup?: boolean;
  requiresEmailVerification?: boolean;
  emailVerificationEmailSent?: boolean;
}

/*
 * Misma autenticación que la web: sesión con cookie (withCredentials) y token CSRF
 * en la cabecera X-XSRF-TOKEN para cada petición que modifica datos.
 * En el móvil, CapacitorHttp y CapacitorCookies (capacitor.config.ts) guardan las cookies.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  iniciarSesion(correo: string, contrasena: string): Observable<RespuestaInicioSesion> {
    return this.postConCsrf<RespuestaInicioSesion>('/usuarios/login', {
      email: correo,
      password: contrasena
    });
  }

  verificarSegundoFactor(codigo: string): Observable<RespuestaInicioSesion> {
    return this.postConCsrf<RespuestaInicioSesion>('/usuarios/login/2fa', { code: codigo });
  }

  verificarTercerFactor(codigo: string): Observable<RespuestaInicioSesion> {
    return this.postConCsrf<RespuestaInicioSesion>('/usuarios/login/3fa/verificar', { code: codigo });
  }

  reenviarTercerFactor(): Observable<void> {
    return this.postConCsrf<void>('/usuarios/login/3fa/reenviar', {});
  }

  obtenerSesionActual(): Observable<RespuestaInicioSesion> {
    return this.http.get<RespuestaInicioSesion>(`${this.api}/usuarios/sesion-actual`, {
      withCredentials: true
    });
  }

  cerrarSesion(): Observable<void> {
    return this.postConCsrf<void>('/usuarios/logout', null);
  }

  /** Pide un token CSRF y lo envía en la petición POST, como hace la web. */
  postConCsrf<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http
      .get<RespuestaTokenCsrf>(`${this.api}/usuarios/csrf`, { withCredentials: true })
      .pipe(
        switchMap(({ token }) =>
          this.http.post<T>(`${this.api}${ruta}`, cuerpo, {
            withCredentials: true,
            headers: new HttpHeaders({ 'X-XSRF-TOKEN': token })
          })
        )
      );
  }
}
