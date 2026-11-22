import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { SeccionPendienteComponent } from '../../shared/seccion-pendiente/seccion-pendiente.component';

@Component({
  selector: 'app-tienda',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, SeccionPendienteComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Catálogo</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <app-seccion-pendiente titulo="Catálogo"></app-seccion-pendiente>
    </ion-content>
  `
})
export class TiendaPage {}
