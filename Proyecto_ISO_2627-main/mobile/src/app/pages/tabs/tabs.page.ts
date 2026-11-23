import { Component, inject, signal } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cart,
  cartOutline,
  list,
  listOutline,
  person,
  personOutline,
  receipt,
  receiptOutline,
  storefront,
  storefrontOutline
} from 'ionicons/icons';
import { CarritoEstadoService } from '../../core/services/carrito-estado.service';

/**
 * Navegación principal del cliente: las mismas secciones que la cabecera de la web
 * (Catálogo, Listas, Carrito, Mis pedidos y Mi perfil). «Listas» reúne los apartados
 * «Favoritos» y «Mis listas» del menú de la web; Favoritos es la primera lista.
 */
@Component({
  selector: 'app-tabs',
  imports: [IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.css'
})
export class TabsPage {
  /** Unidades del carrito: se muestran en un numerito sobre la pestaña Carrito. */
  readonly unidadesCarrito = inject(CarritoEstadoService).unidades;
  /** Pestaña seleccionada: su icono se muestra relleno (no se depende solo del color). */
  readonly activa = signal('tienda');

  readonly pestanas = [
    { tab: 'tienda', texto: 'Tienda', icono: 'storefront' },
    { tab: 'listas', texto: 'Listas', icono: 'list' },
    { tab: 'carrito', texto: 'Carrito', icono: 'cart' },
    { tab: 'pedidos', texto: 'Pedidos', icono: 'receipt' },
    { tab: 'perfil', texto: 'Perfil', icono: 'person' }
  ];

  constructor() {
    addIcons({
      storefront,
      storefrontOutline,
      list,
      listOutline,
      cart,
      cartOutline,
      receipt,
      receiptOutline,
      person,
      personOutline
    });
    inject(CarritoEstadoService).refrescar();
  }

  etiqueta(p: { tab: string; texto: string }): string {
    const n = this.unidadesCarrito();
    return p.tab === 'carrito' && n > 0 ? `Carrito, ${n} ${n === 1 ? 'unidad' : 'unidades'}` : p.texto;
  }

  cambio(evento: { tab: string }): void {
    this.activa.set(evento.tab);
  }
}
