import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, heartOutline, personOutline, receiptOutline, storefrontOutline } from 'ionicons/icons';

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
  constructor() {
    addIcons({ storefrontOutline, heartOutline, cartOutline, receiptOutline, personOutline });
  }
}
