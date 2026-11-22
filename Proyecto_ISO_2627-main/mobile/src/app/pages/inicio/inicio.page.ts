import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';

/** Pantalla provisional tras el login. Se sustituirá por las pestañas (tarea 3). */
@Component({
  selector: 'app-inicio',
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>ESIBuy</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="salir()">Salir</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h1>¡Hola!</h1>
      <p>Has iniciado sesión como <strong>{{ email() }}</strong>.</p>
    </ion-content>
  `
})
export class InicioPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly email = signal('');

  ngOnInit(): void {
    this.auth.obtenerSesionActual().subscribe({
      next: (sesion) => this.email.set(sesion.email)
    });
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe({
      next: () => this.router.navigateByUrl('/login', { replaceUrl: true }),
      error: () => this.router.navigateByUrl('/login', { replaceUrl: true })
    });
  }
}
