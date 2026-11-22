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

/** Finalizar la compra (tarea 8). De momento, aviso provisional. */
@Component({
  selector: 'app-checkout',
  imports: [IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, SeccionPendienteComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/carrito" text="Carrito"></ion-back-button>
        </ion-buttons>
        <ion-title>Finalizar compra</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <app-seccion-pendiente titulo="Finalizar compra"></app-seccion-pendiente>
    </ion-content>
  `
})
export class CheckoutPage {}
