import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, createOutline, homeOutline, trashOutline } from 'ionicons/icons';
import { Direccion } from '../../core/models/direccion';
import { DireccionesService } from '../../core/services/direcciones.service';
import {
  FormularioDireccionComponent,
  mensajeErrorDireccion
} from '../../shared/formulario-direccion/formulario-direccion.component';

/** Mis direcciones: ver, añadir, modificar y eliminar (como en la web). */
@Component({
  selector: 'app-direcciones',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSkeletonText,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './direcciones.page.html',
  styleUrl: './direcciones.page.css'
})
export class DireccionesPage {
  private readonly direccionesApi = inject(DireccionesService);
  private readonly modales = inject(ModalController);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly direcciones = signal<Direccion[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  constructor() {
    addIcons({ addOutline, closeOutline, createOutline, homeOutline, trashOutline });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.direccionesApi.consultar().subscribe({
      next: (d) => {
        this.direcciones.set(d);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorDireccion(e, 'No se pudieron cargar las direcciones.'));
      }
    });
  }

  async abrirFormulario(direccion: Direccion | null = null): Promise<void> {
    const modal = await this.modales.create({
      component: FormularioDireccionComponent,
      componentProps: { direccion }
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'guardado') {
      this.aviso('Dirección guardada correctamente.');
      this.cargar();
    }
  }

  async confirmarEliminar(direccion: Direccion): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Eliminar dirección',
      message: '¿Seguro que quieres eliminar esta dirección? No se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.eliminar(direccion) }
      ]
    });
    await alerta.present();
  }

  private eliminar(direccion: Direccion): void {
    this.direccionesApi.eliminar(direccion.id).subscribe({
      next: () => {
        this.aviso('Dirección eliminada correctamente.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) =>
        this.aviso(mensajeErrorDireccion(e, 'No se pudo eliminar la dirección.'), true)
    });
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 4000 : 2000,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
