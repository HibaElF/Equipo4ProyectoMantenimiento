import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { mensajeErrorApi } from '../../shared/validadores';
import { ConfiguracionSegundoFactor, ConfirmacionSegundoFactor, ModificarPerfilRequest, Perfil } from '../models/perfil';

/** Mismas operaciones que «Mi perfil» de la web, para el cliente. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  consultar(): Observable<Perfil> {
    return this.http.get<Perfil>(`${environment.apiUrl}/usuarios/perfil`, { withCredentials: true });
  }

  modificar(datos: ModificarPerfilRequest): Observable<Perfil> {
    return this.auth.peticionConCsrf<Perfil>('PUT', '/usuarios/perfil', datos);
  }

  /** Hacerse Premium exige un método de pago (pago simulado); volver a Normal, no. */
  cambiarTipoCliente(esPremium: boolean, metodoPagoId: string | null): Observable<Perfil> {
    return this.auth.peticionConCsrf<Perfil>('PUT', '/cliente/tipo', { esPremium, metodoPagoId });
  }

  configurarSegundoFactor(): Observable<ConfiguracionSegundoFactor> {
    return this.auth.peticionConCsrf<ConfiguracionSegundoFactor>('POST', '/usuarios/2fa/configurar');
  }

  confirmarSegundoFactor(code: string): Observable<ConfirmacionSegundoFactor> {
    return this.auth.peticionConCsrf<ConfirmacionSegundoFactor>('POST', '/usuarios/2fa/confirmar', { code });
  }

  desactivarSegundoFactor(code: string): Observable<void> {
    return this.auth.peticionConCsrf<void>('DELETE', '/usuarios/2fa', { code });
  }

  cambiarTercerFactor(activado: boolean): Observable<void> {
    return this.auth.peticionConCsrf<void>('PUT', '/usuarios/3fa/preferencia', { activado });
  }

  darDeBaja(): Observable<void> {
    return this.auth.peticionConCsrf<void>('DELETE', '/cliente/cuenta');
  }
}

/** Mismos mensajes que la web. */
export function mensajeErrorPerfil(error: HttpErrorResponse, porDefecto: string): string {
  if (error.status === 401) return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'No tienes permiso para modificar este perfil.';
  if (error.status === 0) return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  if (error.status >= 500) return porDefecto;
  const mensaje = mensajeErrorApi(error.error, '');
  if (mensaje) return mensaje;
  const otro = error.error?.message;
  return typeof otro === 'string' && otro ? otro : porDefecto;
}
