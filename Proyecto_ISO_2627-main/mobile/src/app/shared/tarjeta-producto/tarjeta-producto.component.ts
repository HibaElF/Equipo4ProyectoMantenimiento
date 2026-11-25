import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, heart, heartOutline, imageOutline, lockClosedOutline } from 'ionicons/icons';
import {
  ProductoCatalogo,
  porcentajeRebaja,
  puedeConsultarDetalle
} from '../../core/models/producto';
import { ProductoService } from '../../core/services/producto.service';

/**
 * Tarjeta de producto del catálogo (dos por fila en el móvil).
 * Muestra lo esencial; el vendedor, el desglose de descuentos y el stock exacto van al detalle.
 */
@Component({
  selector: 'app-tarjeta-producto',
  imports: [DecimalPipe, IonButton, IonIcon, IonSpinner],
  templateUrl: './tarjeta-producto.component.html',
  styleUrl: './tarjeta-producto.component.css'
})
export class TarjetaProductoComponent {
  private readonly productos = inject(ProductoService);

  readonly producto = input.required<ProductoCatalogo>();
  readonly esFavorito = input(false);
  readonly favoritosDisponibles = input(true);
  readonly cambiandoFavorito = input(false);
  readonly anadiendo = input(false);
  readonly bloquearAcciones = input(false);

  readonly abrir = output<ProductoCatalogo>();
  readonly alternarFavorito = output<ProductoCatalogo>();
  readonly anadirAlCarrito = output<ProductoCatalogo>();

  private readonly imagenFallida = signal(false);

  readonly bloqueado = computed(() => !puedeConsultarDetalle(this.producto()));
  readonly agotado = computed(() => this.producto().stock <= 0);
  readonly rebaja = computed(() => porcentajeRebaja(this.producto()));
  readonly imagen = computed(() => {
    const img = this.producto().imagen;
    return img && !this.imagenFallida() ? this.productos.urlImagen(img) : null;
  });
  readonly puedeAnadir = computed(
    () => !this.bloqueado() && this.producto().esVisible && !this.agotado() && this.producto().precio !== null
  );

  constructor() {
    addIcons({ cartOutline, heart, heartOutline, imageOutline, lockClosedOutline });
  }

  marcarImagenFallida(): void {
    this.imagenFallida.set(true);
  }

  pulsarTarjeta(): void {
    if (!this.bloqueado()) this.abrir.emit(this.producto());
  }

  pulsarFavorito(evento: Event): void {
    evento.stopPropagation();
    this.alternarFavorito.emit(this.producto());
  }

  pulsarCarrito(evento: Event): void {
    evento.stopPropagation();
    this.anadirAlCarrito.emit(this.producto());
  }
}
