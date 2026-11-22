import { Component, signal } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cart,
  cartOutline,
  heart,
  heartOutline,
  person,
  personOutline,
  receipt,
  receiptOutline,
  storefront,
  storefrontOutline
} from 'ionicons/icons';

/**
 * Navegación principal del cliente: las mismas secciones que la cabecera de la web
 * (Catálogo, Favoritos, Carrito, Mis pedidos y Mi perfil; «Mis listas» está dentro de Perfil).
 */
@Component({
  selector: 'app-tabs',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.css'
})
export class TabsPage {
  /** Pestaña seleccionada: su icono se muestra relleno (no se depende solo del color). */
  readonly activa = signal('tienda');

  readonly pestanas = [
    { tab: 'tienda', texto: 'Tienda', icono: 'storefront' },
    { tab: 'favoritos', texto: 'Favoritos', icono: 'heart' },
    { tab: 'carrito', texto: 'Carrito', icono: 'cart' },
    { tab: 'pedidos', texto: 'Pedidos', icono: 'receipt' },
    { tab: 'perfil', texto: 'Perfil', icono: 'person' }
  ];

  constructor() {
    addIcons({
      storefront,
      storefrontOutline,
      heart,
      heartOutline,
      cart,
      cartOutline,
      receipt,
      receiptOutline,
      person,
      personOutline
    });
  }

  cambio(evento: { tab: string }): void {
    this.activa.set(evento.tab);
  }
}
