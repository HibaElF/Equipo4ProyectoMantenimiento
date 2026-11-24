import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { RespuestaTokenCsrf } from '../../shared/models/respuesta-token-csrf';

export type TipoAlerta = 'BAJADA_PRECIO' | 'DISPONIBILIDAD' | 'RECOMENDACION';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  productoId: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export interface AlertasResponse {
  alertas: Alerta[];
  noLeidas: number;
}

@Injectable({ providedIn: 'root' })
export class AlertasService {

  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/cliente/alertas`;

  // Alertas sin leer, para el contador de la cabecera.
  readonly noLeidas = signal(0);

  consultar(): Observable<AlertasResponse> {
    return this.http.get<AlertasResponse>(
      this.url,
      { withCredentials: true }
    ).pipe(tap((respuesta) => this.noLeidas.set(respuesta.noLeidas)));
  }

  marcarLeida(alertaId: string): Observable<AlertasResponse> {
    return this.modificar('PATCH', `/${encodeURIComponent(alertaId)}/leida`);
  }

  marcarTodasLeidas(): Observable<AlertasResponse> {
    return this.modificar('PATCH', '/leidas');
  }

  private modificar(
    metodo: 'PATCH',
    ruta: string
  ): Observable<AlertasResponse> {

    return this.http.get<RespuestaTokenCsrf>(
      `${environment.apiUrl}/usuarios/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(({ token }) =>
        this.http.request<AlertasResponse>(
          metodo,
          `${this.url}${ruta}`,
          {
            withCredentials: true,
            headers: new HttpHeaders()
              .set('X-XSRF-TOKEN', token)
          }
        )
      ),
      tap((respuesta) => this.noLeidas.set(respuesta.noLeidas))
    );
  }
}
