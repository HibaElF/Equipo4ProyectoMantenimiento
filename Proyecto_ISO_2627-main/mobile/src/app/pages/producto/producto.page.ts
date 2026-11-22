import { Component } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { SeccionPendienteComponent } from '../../shared/seccion-pendiente/seccion-pendiente.component';

/** Ficha del producto (tarea 6). De momento, aviso provisional. */
@Component({
  selector: 'app-producto',
  imports: [IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, SeccionPendienteComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tienda" text="Catálogo"></ion-back-button>
        </ion-buttons>
        <ion-title>Producto</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <app-seccion-pendiente titulo="Detalle del producto"></app-seccion-pendiente>
    </ion-content>
  `
})
export class ProductoPage {}
