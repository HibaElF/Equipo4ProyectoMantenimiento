import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AlertasResponse } from '../models/alerta';
import { AlertasEstadoService } from './alertas-estado.service';

/** Mismas operaciones que «Mis alertas» de la web; cada respuesta actualiza el contador. */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly estado = inject(AlertasEstadoService);

  consultar(): Observable<AlertasResponse> {
    return this.http
      .get<AlertasResponse>(`${environment.apiUrl}/cliente/alertas`, { withCredentials: true })
      .pipe(tap((r) => this.estado.actualizar(r)));
  }

  marcarLeida(alertaId: string): Observable<AlertasResponse> {
    return this.modificar('PATCH', `/${encodeURIComponent(alertaId)}/leida`);
  }

  marcarTodasLeidas(): Observable<AlertasResponse> {
    return this.modificar('PATCH', '/leidas');
  }

  borrar(alertaId: string): Observable<AlertasResponse> {
    return this.modificar('DELETE', `/${encodeURIComponent(alertaId)}`);
  }

  borrarTodas(): Observable<AlertasResponse> {
    return this.modificar('DELETE', '');
  }

  private modificar(metodo: 'PATCH' | 'DELETE', ruta: string): Observable<AlertasResponse> {
    return this.auth
      .peticionConCsrf<AlertasResponse>(metodo, `/cliente/alertas${ruta}`)
      .pipe(tap((r) => this.estado.actualizar(r)));
  }
}

/** Mismos mensajes que la web. */
export function mensajeErrorAlertas(error: HttpErrorResponse, porDefecto: string): string {
  if (error.status === 401) return 'Tu sesión ha caducado.';
  if (error.status === 0) return 'No se pudo conectar con el servidor.';
  if (error.status === 404) return 'La alerta ya no existe. Recarga la lista.';
  return porDefecto;
}
