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
import { addOutline, cardOutline, closeOutline, logoPaypal, phonePortraitOutline, trashOutline } from 'ionicons/icons';
import { MetodoPago, TipoPago } from '../../core/models/metodo-pago';
import { PagosService } from '../../core/services/pagos.service';
import { FormularioMetodoPagoComponent } from '../../shared/formulario-metodo-pago/formulario-metodo-pago.component';

/** Métodos de pago: ver, añadir y eliminar (como en la web; no se modifican). */
@Component({
  selector: 'app-metodos-pago',
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
  templateUrl: './metodos-pago.page.html',
  styleUrl: '../direcciones/direcciones.page.css'
})
export class MetodosPagoPage {
  private readonly pagosApi = inject(PagosService);
  private readonly modales = inject(ModalController);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly metodos = signal<MetodoPago[]>([]);
  private readonly tipos = signal<TipoPago[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  constructor() {
    addIcons({ addOutline, cardOutline, closeOutline, logoPaypal, phonePortraitOutline, trashOutline });
    this.pagosApi.consultarTipos().subscribe({ next: (t) => this.tipos.set(t), error: () => undefined });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pagosApi.consultarMetodos().subscribe({
      next: (m) => {
        this.metodos.set(m);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          e.status === 0
            ? 'No se pudo conectar con el servicio. Inténtalo de nuevo.'
            : 'No se pudieron cargar tus métodos de pago.'
        );
      }
    });
  }

  /** Nombre legible del tipo, como en la web. */
  nombreTipo(codigo: string): string {
    const tipo = this.tipos().find((t) => t.codigo === codigo);
    if (tipo?.nombre) return tipo.nombre;
    const texto = (codigo ?? '').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  icono(codigo: string): string {
    return codigo === 'PAYPAL' ? 'logo-paypal' : codigo === 'BIZUM' ? 'phone-portrait-outline' : 'card-outline';
  }

  async abrirFormulario(): Promise<void> {
    const modal = await this.modales.create({ component: FormularioMetodoPagoComponent });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'guardado') {
      this.aviso('Método de pago registrado correctamente.');
      this.cargar();
    }
  }

  async confirmarEliminar(metodo: MetodoPago): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Eliminar método de pago',
      message: '¿Seguro que quieres eliminar este método de pago? No se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.eliminar(metodo) }
      ]
    });
    await alerta.present();
  }

  private eliminar(metodo: MetodoPago): void {
    this.pagosApi.eliminar(metodo.id).subscribe({
      next: () => {
        this.aviso('Método de pago eliminado correctamente.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) =>
        this.aviso(e.error?.message ?? 'No se pudo eliminar el método de pago.', true)
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
