import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  homeOutline,
  listOutline,
  logOutOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  starOutline,
  trashOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';

interface OpcionPerfil {
  texto: string;
  icono: string;
}

/**
 * Pestaña Perfil: acceso a las secciones de «Mi perfil» de la web
 * (datos, seguridad, direcciones, métodos de pago) y a «Mis listas».
 */
@Component({
  selector: 'app-perfil',
  imports: [
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.css'
})
export class PerfilPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);

  readonly email = signal('');

  readonly cuenta: OpcionPerfil[] = [
    { texto: 'Mis datos y foto', icono: 'person-circle-outline' },
    { texto: 'Cliente premium', icono: 'star-outline' },
    { texto: 'Seguridad y segundo factor', icono: 'shield-checkmark-outline' }
  ];
  readonly compras: OpcionPerfil[] = [
    { texto: 'Mis direcciones', icono: 'home-outline' },
    { texto: 'Métodos de pago', icono: 'card-outline' },
    { texto: 'Mis listas', icono: 'list-outline' }
  ];
  readonly baja: OpcionPerfil = { texto: 'Darme de baja', icono: 'trash-outline' };

  constructor() {
    addIcons({
      personCircleOutline,
      shieldCheckmarkOutline,
      homeOutline,
      cardOutline,
      listOutline,
      logOutOutline,
      starOutline,
      trashOutline
    });
  }

  ngOnInit(): void {
    this.auth.obtenerSesionActual().subscribe({
      next: (sesion) => this.email.set(sesion.email)
    });
  }

  async confirmarCierreSesion(): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Cerrar sesión',
      message: '¿Quieres cerrar la sesión en este dispositivo?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar sesión', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.cerrarSesion() }
      ]
    });
    await alerta.present();
  }

  private cerrarSesion(): void {
    const irAlLogin = () => this.router.navigateByUrl('/login', { replaceUrl: true });
    this.auth.cerrarSesion().subscribe({ next: irAlLogin, error: irAlLogin });
  }
}
