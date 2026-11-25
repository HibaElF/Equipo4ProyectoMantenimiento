import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AlertasResponse } from '../models/alerta';

/** Como mucho una consulta del contador cada 30 s (el backend limita las peticiones por minuto). */
export const INTERVALO_CONTADOR_MS = 30_000;

/**
 * Contador de alertas sin leer de la campana, como el contador de la cabecera de la web.
 * Va aparte de AlertasService para que AuthService pueda ponerlo a cero al cerrar sesión.
 */
@Injectable({ providedIn: 'root' })
export class AlertasEstadoService {
  private readonly http = inject(HttpClient);
  private ultimaConsulta = 0;

  readonly noLeidas = signal(0);

  actualizar(respuesta: AlertasResponse): void {
    this.noLeidas.set(respuesta.noLeidas);
    this.ultimaConsulta = Date.now();
  }

  /**
   * Vuelve a pedir el contador: al abrir la app, al volver a ella y al cambiar de pestaña.
   * Sin «forzar», no repite la consulta si se hizo hace menos de 30 s. Si falla, la campana
   * se queda como estaba: el contador nunca estorba.
   */
  refrescar(forzar = false): void {
    if (!forzar && Date.now() - this.ultimaConsulta < INTERVALO_CONTADOR_MS) return;
    this.ultimaConsulta = Date.now();
    this.http.get<AlertasResponse>(`${environment.apiUrl}/cliente/alertas`, { withCredentials: true }).subscribe({
      next: (r) => this.noLeidas.set(r.noLeidas),
      error: () => undefined
    });
  }

  reiniciar(): void {
    this.noLeidas.set(0);
    this.ultimaConsulta = 0;
  }
}
