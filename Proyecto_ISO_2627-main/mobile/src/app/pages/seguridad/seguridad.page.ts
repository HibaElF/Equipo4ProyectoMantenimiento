import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonNote,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { closeOutline, copyOutline, keyOutline, mailOutline, openOutline, shieldCheckmark } from 'ionicons/icons';
import { Perfil, secretoTotp } from '../../core/models/perfil';
import { PerfilService, mensajeErrorPerfil } from '../../core/services/perfil.service';

/** Normaliza un código: sin espacios ni guiones. */
export function limpiarCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, '');
}

/** Código de la aplicación (6 cifras), como la web. */
export function esCodigoTotp(codigo: string): boolean {
  return /^\d{6}$/.test(limpiarCodigo(codigo));
}

/** Para desactivar: código de la aplicación o uno de respaldo. */
export function esCodigoDesactivacion(codigo: string): boolean {
  return /^(\d{6}|[A-Z2-7]{8}|[A-Z2-7]{16})$/.test(limpiarCodigo(codigo).toUpperCase());
}

/** Seguridad de la web: segundo factor (TOTP) y tercer factor (código por correo). */
@Component({
  selector: 'app-seguridad',
  imports: [
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonNote,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar
  ],
  templateUrl: './seguridad.page.html',
  styleUrl: './seguridad.page.css'
})
export class SeguridadPage {
  private readonly perfilApi = inject(PerfilService);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Segundo factor
  readonly configuracion = signal<{ otpauthUri: string | null; qrDataUrl: string | null } | null>(null);
  readonly secreto = computed(() => secretoTotp(this.configuracion()?.otpauthUri ?? null));
  readonly codigosRespaldo = signal<string[]>([]);
  readonly cargandoTotp = signal(false);
  readonly mensajeTotp = signal('');
  readonly errorTotp = signal('');
  codigo = '';

  /**
   * El enlace otpauth:// solo lo puede abrir una app de autenticación del propio móvil:
   * en el navegador del ordenador no hace nada, así que allí solo se muestran la clave y el QR.
   */
  readonly esAppInstalada = Capacitor.isNativePlatform();

  // Tercer factor
  readonly guardandoCorreo = signal(false);
  readonly errorCorreo = signal('');

  constructor() {
    addIcons({ closeOutline, copyOutline, keyOutline, mailOutline, openOutline, shieldCheckmark });
  }

  ionViewWillEnter(): void {
    if (!this.configuracion()) this.cargar();
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

  configurar(): void {
    this.cargandoTotp.set(true);
    this.errorTotp.set('');
    this.mensajeTotp.set('');
    this.codigo = '';
    this.perfilApi.configurarSegundoFactor().subscribe({
      next: (r) => {
        this.cargandoTotp.set(false);
        if (r.enabled) {
          this.mensajeTotp.set('El segundo factor ya está activado.');
          this.perfil.update((p) => (p ? { ...p, totpActivado: true } : p));
          return;
        }
        this.configuracion.set({ otpauthUri: r.otpauthUri, qrDataUrl: r.qrDataUrl });
      },
      error: () => {
        this.cargandoTotp.set(false);
        this.errorTotp.set('No se pudo iniciar la configuración del segundo factor.');
      }
    });
  }

  cancelarConfiguracion(): void {
    this.configuracion.set(null);
    this.codigo = '';
    this.errorTotp.set('');
  }

  confirmar(): void {
    if (!esCodigoTotp(this.codigo)) {
      this.errorTotp.set('Introduce un código TOTP de 6 cifras.');
      return;
    }
    this.cargandoTotp.set(true);
    this.errorTotp.set('');
    this.perfilApi.confirmarSegundoFactor(limpiarCodigo(this.codigo)).subscribe({
      next: (r) => {
        this.cargandoTotp.set(false);
        this.codigosRespaldo.set(r.backupCodes);
        this.configuracion.set(null);
        this.codigo = '';
        this.mensajeTotp.set('TOTP activado. Guarda estos códigos de respaldo en un lugar seguro.');
        this.perfil.update((p) => (p ? { ...p, totpActivado: true } : p));
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoTotp.set(false);
        this.errorTotp.set(mensajeErrorPerfil(e, 'No se pudo activar el segundo factor. Inténtalo de nuevo.'));
      }
    });
  }

  async desactivar(): Promise<void> {
    if (this.perfil()?.emailOtpActivado || this.guardandoCorreo()) {
      this.errorTotp.set('Desactiva primero la verificación por correo.');
      return;
    }
    if (!esCodigoDesactivacion(this.codigo)) {
      this.errorTotp.set('Introduce un código actual de la aplicación o un código de respaldo para desactivar TOTP.');
      return;
    }
    const codigo = limpiarCodigo(this.codigo).toUpperCase();
    const alerta = await this.alertas.create({
      header: 'Desactivar el segundo factor',
      message: 'Tu cuenta quedará protegida solo con la contraseña.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Desactivar', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.desactivarConCodigo(codigo) }
      ]
    });
    await alerta.present();
  }

  private desactivarConCodigo(codigo: string): void {
    this.cargandoTotp.set(true);
    this.errorTotp.set('');
    this.mensajeTotp.set('');
    this.perfilApi.desactivarSegundoFactor(codigo).subscribe({
      next: () => {
        this.cargandoTotp.set(false);
        this.perfil.update((p) => (p ? { ...p, totpActivado: false } : p));
        this.codigo = '';
        this.codigosRespaldo.set([]);
        this.mensajeTotp.set('Segundo factor desactivado.');
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoTotp.set(false);
        this.errorTotp.set(mensajeErrorPerfil(e, 'No se pudo desactivar el segundo factor.'));
      }
    });
  }

  cambiarCorreo(evento: CustomEvent<{ checked: boolean }>): void {
    const activado = evento.detail.checked;
    const p = this.perfil();
    // El interruptor solo refleja lo que confirma el servidor.
    (evento.target as HTMLIonToggleElement).checked = p?.emailOtpActivado ?? false;
    if (!p || this.guardandoCorreo() || this.cargandoTotp()) return;
    if (activado && !p.totpActivado) {
      this.errorCorreo.set('Activa primero la verificación con tu aplicación de autenticación.');
      return;
    }
    this.guardandoCorreo.set(true);
    this.errorCorreo.set('');
    this.perfilApi.cambiarTercerFactor(activado).subscribe({
      next: () => {
        this.guardandoCorreo.set(false);
        this.perfil.update((actual) => (actual ? { ...actual, emailOtpActivado: activado } : actual));
        this.aviso(
          activado ? 'Has activado la verificación adicional por correo.' : 'Has desactivado la verificación adicional por correo.'
        );
      },
      error: () => {
        this.guardandoCorreo.set(false);
        this.errorCorreo.set('No se pudo actualizar la configuración de seguridad.');
      }
    });
  }

  copiarClave(): void {
    const clave = this.secreto();
    if (clave) void this.copiar(clave.replace(/\s/g, ''), 'Clave');
  }

  async copiar(texto: string, que: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.aviso(`${que} copiad${que.endsWith('s') ? 'os' : 'a'}.`);
    } catch {
      this.aviso('No se pudo copiar. Anótalo a mano.', true);
    }
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
