import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Compra, CrearPedidoRequest } from '../models/pedido';
import { CarritoEstadoService } from './carrito-estado.service';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pago del carrito (pago simulado), igual que la web.
 * La operación pendiente se guarda en sessionStorage: si se corta la conexión al pagar,
 * se reintenta con el mismo operacionId y el backend no cobra dos veces.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly auth = inject(AuthService);
  private readonly carritoEstado = inject(CarritoEstadoService);

  pagar(request: CrearPedidoRequest): Observable<Compra> {
    return this.auth
      .peticionConCsrf<Compra>('POST', '/cliente/pedidos', {
        direccionId: request.direccionId,
        metodoPagoId: request.metodoPagoId,
        operacionId: request.operacionId
      })
      // Tras comprar, el backend vacía el carrito: se actualiza el numerito de la pestaña.
      .pipe(tap(() => this.carritoEstado.refrescar()));
  }

  nuevoIdentificador(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Alternativa para navegadores sin randomUUID (mismo formato UUID v4).
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  obtenerOperacion(email: string): CrearPedidoRequest | null {
    const guardado = sessionStorage.getItem(this.clave(email));
    if (!guardado) return null;
    const r = JSON.parse(guardado) as Partial<CrearPedidoRequest>;
    const valido = (v: unknown) => typeof v === 'string' && v.trim() !== '' && v.length <= 128;
    if (!r || !valido(r.direccionId) || !valido(r.metodoPagoId) || !FORMATO_UUID.test(String(r.operacionId))) {
      throw new Error('No se pudo recuperar la operación pendiente.');
    }
    return { direccionId: r.direccionId!, metodoPagoId: r.metodoPagoId!, operacionId: r.operacionId! };
  }

  guardarOperacion(email: string, request: CrearPedidoRequest): void {
    sessionStorage.setItem(this.clave(email), JSON.stringify(request));
  }

  limpiarOperacion(email: string): void {
    try {
      sessionStorage.removeItem(this.clave(email));
    } catch {
      // Si el almacenamiento no está disponible no hay nada que limpiar.
    }
  }

  private clave(email: string): string {
    return `esibuy.checkout.${email.trim().toLowerCase()}`;
  }
}

/** Mismos mensajes que la web. */
export function mensajeErrorCheckout(fallo: HttpErrorResponse, porDefecto: string, hayPendiente: boolean): string {
  if (fallo.status === 400 && typeof fallo.error?.error === 'string') return fallo.error.error;
  if (fallo.status === 409) return 'La compra ha cambiado o se está procesando. Comprueba de nuevo el resultado.';
  if ([0, 503].includes(fallo.status) && hayPendiente) {
    return 'No hemos podido confirmar el resultado del pago. Comprueba el resultado para evitar otra compra.';
  }
  if (fallo.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo para continuar.';
  if (fallo.status === 403) {
    return 'No tienes permiso para completar esta operación. Comprueba tu sesión e inténtalo de nuevo.';
  }
  if (fallo.status === 0) return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  return porDefecto;
}
