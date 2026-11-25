import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, chevronForwardOutline, closeOutline, notificationsOffOutline, trashOutline } from 'ionicons/icons';
import { Alerta, AlertasResponse, TipoAlerta, etiquetaTipoAlerta } from '../../core/models/alerta';
import { AlertasService, mensajeErrorAlertas } from '../../core/services/alertas.service';

/** «Mis alertas»: mismas opciones y textos que la web. */
@Component({
  selector: 'app-alertas',
  imports: [
    DatePipe,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './alertas.page.html',
  styleUrl: './alertas.page.css'
})
export class AlertasPage {
  private readonly api = inject(AlertasService);
  private readonly router = inject(Router);
  private readonly alertasUi = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly alertas = signal<Alerta[]>([]);
  readonly noLeidas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal('');
  /** Id de la alerta con una operación en curso, o 'todas'. */
  readonly operacion = signal<string | null>(null);

  constructor() {
    addIcons({ checkmarkDoneOutline, chevronForwardOutline, closeOutline, notificationsOffOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.consultar().subscribe({
      next: (r) => {
        this.actualizar(r);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorAlertas(e, 'No se pudieron cargar tus alertas.'));
        alTerminar?.();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargar(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  etiquetaTipo(tipo: TipoAlerta): string {
    return etiquetaTipoAlerta(tipo);
  }

  /** Al pulsar una alerta se abre su producto y, si era nueva, se marca como leída. */
  abrir(alerta: Alerta): void {
    if (!alerta.leida) {
      this.api.marcarLeida(alerta.id).subscribe({ next: (r) => this.actualizar(r), error: () => undefined });
    }
    this.router.navigate(['/tienda/producto', alerta.productoId]);
  }

  marcarLeida(alerta: Alerta): void {
    this.ejecutar(alerta.id, this.api.marcarLeida(alerta.id), null, 'No se pudo marcar la alerta como leída.');
  }

  marcarTodasLeidas(): void {
    this.ejecutar(
      'todas',
      this.api.marcarTodasLeidas(),
      'Todas las alertas están marcadas como leídas.',
      'No se pudieron marcar las alertas como leídas.'
    );
  }

  borrar(alerta: Alerta): void {
    this.ejecutar(alerta.id, this.api.borrar(alerta.id), 'Alerta borrada.', 'No se pudo borrar la alerta.');
  }

  async confirmarBorrarTodas(): Promise<void> {
    if (this.operacion() !== null) return;
    const alerta = await this.alertasUi.create({
      header: 'Borrar alertas',
      message: '¿Borrar todas tus alertas? No se podrán recuperar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar todas',
          role: 'destructive',
          cssClass: 'boton-peligro',
          handler: () =>
            this.ejecutar(
              'todas',
              this.api.borrarTodas(),
              'Se han borrado todas tus alertas.',
              'No se pudieron borrar las alertas.'
            )
        }
      ]
    });
    await alerta.present();
  }

  private ejecutar(
    clave: string,
    peticion: ReturnType<AlertasService['consultar']>,
    exito: string | null,
    porDefecto: string
  ): void {
    if (this.operacion() !== null) return;
    this.operacion.set(clave);
    peticion.subscribe({
      next: (r) => {
        this.actualizar(r);
        this.operacion.set(null);
        if (exito) void this.aviso(exito);
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(null);
        void this.aviso(mensajeErrorAlertas(e, porDefecto), true);
        // Si la alerta ya no existe, se recarga la lista para mostrar su estado real.
        if (e.status === 404) this.cargar();
      }
    });
  }

  private actualizar(r: AlertasResponse): void {
    this.alertas.set(r.alertas);
    this.noLeidas.set(r.noLeidas);
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 4000 : 2500,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
