import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Carrito } from '../models/carrito';

/**
 * Estado del carrito compartido por toda la app (para el numerito de la pestaña).
 * CarritoService lo actualiza tras cada operación; aquí solo se guarda y se consulta.
 */
@Injectable({ providedIn: 'root' })
export class CarritoEstadoService {
  private readonly http = inject(HttpClient);
  private readonly carrito = signal<Carrito | null>(null);

  /** Total de unidades (suma de cantidades), como el contador de la web. */
  readonly unidades = computed(() => this.carrito()?.productos.reduce((t, l) => t + l.cantidad, 0) ?? 0);

  actualizar(carrito: Carrito): void {
    this.carrito.set(carrito);
  }

  /** Vuelve a pedir el carrito al backend (al entrar en la app). */
  refrescar(): void {
    this.http.get<Carrito>(`${environment.apiUrl}/cliente/carrito`, { withCredentials: true }).subscribe({
      next: (c) => this.carrito.set(c),
      error: () => undefined
    });
  }

  reiniciar(): void {
    this.carrito.set(null);
  }
}
