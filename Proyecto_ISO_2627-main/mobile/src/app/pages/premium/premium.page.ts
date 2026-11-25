import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
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
  IonModal,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, alertCircle, checkmarkCircle, closeOutline, star } from 'ionicons/icons';
import { MetodoPago } from '../../core/models/metodo-pago';
import { Perfil } from '../../core/models/perfil';
import { PagosService } from '../../core/services/pagos.service';
import { PerfilService, mensajeErrorPerfil } from '../../core/services/perfil.service';

/** «Tipo de cuenta» de la web: hacerse Premium (pago simulado) o volver a Normal. */
@Component({
  selector: 'app-premium',
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
    IonModal,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './premium.page.html',
  styleUrl: './premium.page.css'
})
export class PremiumPage {
  private readonly perfilApi = inject(PerfilService);
  private readonly pagosApi = inject(PagosService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly guardando = signal(false);

  // Pago (simulado) para hacerse Premium
  readonly ventanaPago = signal(false);
  readonly metodos = signal<MetodoPago[]>([]);
  readonly cargandoMetodos = signal(false);
  readonly metodoSeleccionado = signal('');
  readonly errorPago = signal('');
  /** Se fue a añadir un método de pago desde la ventana: al volver se reabre. */
  private reabrirPago = false;

  constructor() {
    addIcons({ addOutline, alertCircle, checkmarkCircle, closeOutline, star });
  }

  ionViewWillEnter(): void {
    this.cargar();
    // Al volver de añadir un método de pago se reabre la ventana con la lista actualizada.
    if (this.reabrirPago) {
      this.reabrirPago = false;
      this.ventanaPago.set(true);
      this.cargarMetodos();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.perfilApi.consultar().subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorPerfil(e, 'No se pudo cargar el perfil. Inténtalo de nuevo.'));
      }
    });
  }

  cambiarTipo(): void {
    const p = this.perfil();
    if (!p || this.guardando()) return;
    if (p.esPremium) {
      void this.confirmarVolverANormal();
    } else {
      this.errorPago.set('');
      this.metodoSeleccionado.set('');
      this.ventanaPago.set(true);
      this.cargarMetodos();
    }
  }

  cargarMetodos(): void {
    this.cargandoMetodos.set(true);
    this.errorPago.set('');
    this.pagosApi.consultarMetodos().subscribe({
      next: (metodos) => {
        this.metodos.set(metodos);
        if (metodos.length === 1) this.metodoSeleccionado.set(metodos[0].id);
        this.cargandoMetodos.set(false);
      },
      error: () => {
        this.metodos.set([]);
        this.cargandoMetodos.set(false);
        this.errorPago.set('No se pudieron cargar tus métodos de pago.');
      }
    });
  }

  seleccionarMetodo(valor: unknown): void {
    this.metodoSeleccionado.set(typeof valor === 'string' ? valor : '');
  }

  cerrarPago(): void {
    if (!this.guardando()) this.ventanaPago.set(false);
  }

  irAMetodosPago(): void {
    this.reabrirPago = true;
    this.ventanaPago.set(false);
    this.router.navigate(['/perfil/metodos-pago']);
  }

  pagarYHacersePremium(): void {
    if (this.guardando()) return;
    const metodo = this.metodoSeleccionado();
    if (!metodo) {
      this.errorPago.set('Selecciona un método de pago para hacerte Premium.');
      return;
    }
    this.guardando.set(true);
    this.errorPago.set('');
    this.perfilApi.cambiarTipoCliente(true, metodo).subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.guardando.set(false);
        this.ventanaPago.set(false);
        this.aviso('Pago realizado. Ya eres cliente Premium.');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorPago.set(mensajeErrorPerfil(e, 'No se pudo actualizar el tipo de cliente.'));
      }
    });
  }

  private async confirmarVolverANormal(): Promise<void> {
    const alerta = await this.alertas.create({
      subHeader: 'Cambio de cuenta',
      header: '¿Quieres volver a cliente normal?',
      message: 'Al volver a cliente normal perderás las ventajas asociadas a Premium.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, volver a Normal', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.volverANormal() }
      ]
    });
    await alerta.present();
  }

  volverANormal(): void {
    this.guardando.set(true);
    this.perfilApi.cambiarTipoCliente(false, null).subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.guardando.set(false);
        this.aviso('El tipo de cliente se ha actualizado correctamente.');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aviso(mensajeErrorPerfil(e, 'No se pudo actualizar el tipo de cliente.'), true);
      }
    });
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 4500 : 3000,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
