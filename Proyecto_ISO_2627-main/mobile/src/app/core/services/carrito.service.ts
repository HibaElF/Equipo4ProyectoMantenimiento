import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Carrito } from '../models/carrito';
import { CarritoEstadoService } from './carrito-estado.service';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly estado = inject(CarritoEstadoService);

  // Cada respuesta actualiza el numerito de la pestaña Carrito.
  private readonly guardarEstado = tap<Carrito>((c) => this.estado.actualizar(c));

  consultar(): Observable<Carrito> {
    return this.http
      .get<Carrito>(`${environment.apiUrl}/cliente/carrito`, { withCredentials: true })
      .pipe(this.guardarEstado);
  }

  anadirProducto(productoId: string, cantidad: number): Observable<Carrito> {
    return this.auth
      .peticionConCsrf<Carrito>('POST', '/cliente/carrito/productos', { productoId, cantidad })
      .pipe(this.guardarEstado);
  }

  modificarCantidad(productoId: string, cantidad: number): Observable<Carrito> {
    return this.auth
      .peticionConCsrf<Carrito>('PUT', `/cliente/carrito/productos/${encodeURIComponent(productoId)}`, { cantidad })
      .pipe(this.guardarEstado);
  }

  eliminarProducto(productoId: string): Observable<Carrito> {
    return this.auth
      .peticionConCsrf<Carrito>('DELETE', `/cliente/carrito/productos/${encodeURIComponent(productoId)}`)
      .pipe(this.guardarEstado);
  }

  /** «Descartar carrito» en la web. */
  vaciar(): Observable<Carrito> {
    return this.auth.peticionConCsrf<Carrito>('DELETE', '/cliente/carrito').pipe(this.guardarEstado);
  }
}

/** Mensajes de error de la pantalla Carrito (los mismos que la web). */
export function mensajeErrorOperacionCarrito(error: HttpErrorResponse, porDefecto: string, deLinea = false): string {
  const permitidos = new Set([
    'La cantidad debe ser mayor que cero.',
    'El producto ya no está disponible.',
    'El producto está agotado.',
    'Este producto solo está disponible para clientes Premium.',
    'No hay stock suficiente para la cantidad solicitada.',
    'Un producto del carrito no tiene un precio disponible.'
  ]);
  if (error.status === 0) return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  if ([400, 403].includes(error.status) && permitidos.has(error.error?.error)) return error.error.error;
  if (error.status === 404 && deLinea) return 'El producto ya no está en el carrito o ha sido eliminado.';
  if (error.status === 409) return 'El carrito se ha modificado. Vuelve a intentarlo.';
  return porDefecto;
}

/** Mismos mensajes que la web: solo se muestran los mensajes funcionales conocidos del backend. */
export function mensajeErrorCarrito(error: HttpErrorResponse): string {
  if (error.status === 0) return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  const permitidos = new Set([
    'La cantidad debe ser mayor que cero.',
    'El producto ya no está disponible.',
    'Un producto del carrito ya no está disponible.',
    'No hay stock suficiente para la cantidad total solicitada.',
    'No hay stock suficiente para un producto del carrito.',
    'Este producto solo está disponible para clientes Premium.',
    'Un producto del carrito solo está disponible para clientes Premium.',
    'Un producto del carrito no tiene un precio disponible.'
  ]);
  const mensaje = error.error?.error;
  if ([400, 403, 404].includes(error.status) && permitidos.has(mensaje)) return mensaje;
  if (error.status === 404) return 'El producto ya no está disponible o ha sido eliminado.';
  if (error.status === 403) return 'No tienes permiso para añadir el producto. Comprueba tu sesión e inténtalo de nuevo.';
  if (error.status === 400) return 'No se pudo añadir el producto. Revisa la cantidad y la disponibilidad.';
  if (error.status === 409) return 'El carrito se ha modificado. Inténtalo de nuevo.';
  return 'No se pudo añadir el producto al carrito. Inténtalo de nuevo.';
}
