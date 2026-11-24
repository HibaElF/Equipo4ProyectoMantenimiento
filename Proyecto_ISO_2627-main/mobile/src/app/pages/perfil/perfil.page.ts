import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  closeOutline,
  homeOutline,
  listOutline,
  logOutOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  star,
  starOutline,
  trashOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { Perfil } from '../../core/models/perfil';
import { PerfilService, mensajeErrorPerfil } from '../../core/services/perfil.service';
import { AvatarPerfilComponent } from '../../shared/avatar-perfil/avatar-perfil.component';

/**
 * Pestaña Perfil: las secciones de «Mi perfil» de la web (datos, tipo de cuenta, seguridad,
 * direcciones, métodos de pago, baja) más «Mis listas» y cerrar sesión.
 */
import { BotonAlertasComponent } from '../../shared/boton-alertas/boton-alertas.component';

@Component({
  selector: 'app-perfil',
  imports: [
    BotonAlertasComponent,
    RouterLink,
    AvatarPerfilComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.css'
})
export class PerfilPage {
  private readonly auth = inject(AuthService);
  private readonly perfilApi = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly bajaEnCurso = signal(false);

  constructor() {
    addIcons({
      cardOutline,
      closeOutline,
      homeOutline,
      listOutline,
      logOutOutline,
      personCircleOutline,
      shieldCheckmarkOutline,
      star,
      starOutline,
      trashOutline
    });
  }

  /** Se recarga al volver de Mis datos, Premium o Seguridad para mostrar los cambios. */
  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    this.cargando.set(true);
    this.error.set('');
    this.perfilApi.consultar().subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorPerfil(e, 'No se pudo cargar el perfil. Inténtalo de nuevo.'));
        alTerminar?.();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargar(() => (evento.target as HTMLIonRefresherElement).complete());
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

  /** Igual que la web: la baja requiere dos confirmaciones. */
  async iniciarBaja(): Promise<void> {
    if (this.bajaEnCurso()) return;
    const aviso1 = await this.alertas.create({
      subHeader: 'Aviso 1 de 2',
      header: '¿Quieres iniciar la baja?',
      message:
        'Se eliminarán tu perfil, direcciones, métodos de pago y carrito. Tus pedidos se conservarán sin datos que te identifiquen; con pedidos pagados o enviados la baja se rechazará.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', role: 'destructive', cssClass: 'boton-peligro', handler: () => void this.confirmarBaja() }
      ]
    });
    await aviso1.present();
  }

  private async confirmarBaja(): Promise<void> {
    const aviso2 = await this.alertas.create({
      subHeader: 'Aviso 2 de 2',
      header: 'La eliminación es permanente',
      message: 'Perderás el acceso a esta cuenta y no podrás recuperar los datos eliminados. Confirma solo si quieres completar la baja.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar mi cuenta', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.darDeBaja() }
      ]
    });
    await aviso2.present();
  }

  darDeBaja(): void {
    this.bajaEnCurso.set(true);
    this.perfilApi.darDeBaja().subscribe({
      next: () => {
        this.bajaEnCurso.set(false);
        // Se limpia el estado local (carrito) aunque la sesión ya no exista en el servidor.
        const irAlLogin = () => this.router.navigate(['/login'], { queryParams: { motivo: 'cuenta-eliminada' }, replaceUrl: true });
        this.auth.cerrarSesion().subscribe({ next: irAlLogin, error: irAlLogin });
      },
      error: (e: HttpErrorResponse) => {
        this.bajaEnCurso.set(false);
        this.aviso(mensajeErrorPerfil(e, 'No se pudo eliminar la cuenta. Inténtalo de nuevo.'));
      }
    });
  }

  private async aviso(mensaje: string): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: 5000,
      position: 'top',
      color: 'danger',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
