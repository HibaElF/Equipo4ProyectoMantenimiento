import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { CrearValoracion, PedidoCliente } from '../models/pedido';

/** Mismas operaciones que «Mis pedidos» de la web. */
@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ruta = '/cliente/pedidos';

  consultarActivos(): Observable<PedidoCliente[]> {
    return this.http.get<PedidoCliente[]>(`${environment.apiUrl}${this.ruta}/activos`, { withCredentials: true });
  }

  consultarHistorico(): Observable<PedidoCliente[]> {
    return this.http.get<PedidoCliente[]>(`${environment.apiUrl}${this.ruta}/historico`, { withCredentials: true });
  }

  consultarDetalle(pedidoId: string): Observable<PedidoCliente> {
    return this.http.get<PedidoCliente>(`${environment.apiUrl}${this.rutaPedido(pedidoId)}`, { withCredentials: true });
  }

  cancelar(pedidoId: string): Observable<PedidoCliente> {
    return this.auth.peticionConCsrf<PedidoCliente>('POST', `${this.rutaPedido(pedidoId)}/cancelar`, null);
  }

  confirmarRecepcion(pedidoId: string): Observable<PedidoCliente> {
    return this.auth.peticionConCsrf<PedidoCliente>('POST', `${this.rutaPedido(pedidoId)}/confirmar-recepcion`, null);
  }

  consultarEstadoValoracion(pedidoId: string, productoId: string): Observable<{ valorada: boolean }> {
    return this.http.get<{ valorada: boolean }>(
      `${environment.apiUrl}${this.rutaProducto(pedidoId, productoId)}/valoraciones/estado`,
      { withCredentials: true }
    );
  }

  valorarProducto(pedidoId: string, productoId: string, valoracion: CrearValoracion): Observable<unknown> {
    return this.auth.peticionConCsrf('POST', `${this.rutaProducto(pedidoId, productoId)}/valoraciones`, valoracion);
  }

  private rutaPedido(pedidoId: string): string {
    return `${this.ruta}/${encodeURIComponent(pedidoId)}`;
  }

  private rutaProducto(pedidoId: string, productoId: string): string {
    return `${this.rutaPedido(pedidoId)}/productos/${encodeURIComponent(productoId)}`;
  }
}

type Operacion = 'consulta' | 'cancelar' | 'recepcion' | 'valoracion';

/** Mismos mensajes de error que la web para cada operación. */
export function mensajeErrorPedido(error: HttpErrorResponse, operacion: Operacion): string {
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión nuevamente.';
  if (error.status === 0) {
    return operacion === 'consulta'
      ? 'No se puede conectar con el servidor.'
      : 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  }
  const cuerpo = error.error;
  if (operacion !== 'consulta' && typeof cuerpo?.error === 'string') return cuerpo.error;
  switch (operacion) {
    case 'consulta':
      if (error.status === 403) return 'No tienes permiso para consultar estos pedidos.';
      if (error.status === 404) return 'El pedido no existe o no está disponible.';
      return 'Ha ocurrido un error al consultar los pedidos.';
    case 'cancelar':
      if (error.status === 404) return 'El pedido no existe o no está disponible.';
      return 'No se pudo cancelar el pedido. Inténtalo de nuevo.';
    case 'recepcion':
      if (error.status === 404) return 'El pedido no existe o no está disponible.';
      if (error.status === 409) return 'El pedido ya no está en estado enviado.';
      if (error.status === 403) return 'No tienes permiso para confirmar este pedido.';
      return 'No se pudo confirmar la recepción. Inténtalo de nuevo.';
    case 'valoracion':
      if (error.status === 404) return 'El pedido o producto no existe o no está disponible para valorar.';
      if (error.status === 409) return 'Este producto ya está valorado.';
      if (error.status === 403) return 'No tienes permiso para valorar este producto.';
      return 'No se pudo guardar la valoración. Inténtalo de nuevo.';
  }
}
