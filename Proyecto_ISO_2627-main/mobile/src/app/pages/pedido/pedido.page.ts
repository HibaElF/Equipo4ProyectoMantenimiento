import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonModal,
  IonNote,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  closeCircle,
  closeOutline,
  ellipseOutline,
  locationOutline,
  star,
  starOutline
} from 'ionicons/icons';
import {
  CambioEstadoPedido,
  EstadoPedido,
  LineaPedido,
  PedidoCliente,
  puedeCancelar,
  puedeConfirmarRecepcion,
  referenciaPedido,
  textoEstadoPedido,
  vendedoresPedido
} from '../../core/models/pedido';
import { PedidosService, mensajeErrorPedido } from '../../core/services/pedidos.service';
import { EstadoPedidoComponent } from '../../shared/estado-pedido/estado-pedido.component';

interface EstadoValoracion {
  estado: 'cargando' | 'pendiente' | 'valorada' | 'error';
  mensaje: string;
}

const RECORRIDO: EstadoPedido[] = ['EN_PROCESO', 'PAGADO_COMPLETADO', 'TRAMITADO_ENVIADO', 'FINALIZADO'];

/** Detalle y seguimiento de un pedido: cancelar, confirmar la recepción y valorar (como en la web). */
@Component({
  selector: 'app-pedido',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    EstadoPedidoComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonModal,
    IonNote,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTextarea,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './pedido.page.html',
  styleUrl: './pedido.page.css'
})
export class PedidoPage {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidosApi = inject(PedidosService);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly pedido = signal<PedidoCliente | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly operando = signal<'cancelar' | 'recepcion' | null>(null);

  readonly referencia = referenciaPedido;
  readonly vendedores = vendedoresPedido;
  readonly textoEstado = textoEstadoPedido;
  readonly puedeCancelar = computed(() => !!this.pedido() && puedeCancelar(this.pedido()!.estado));
  readonly puedeConfirmar = computed(() => !!this.pedido() && puedeConfirmarRecepcion(this.pedido()!.estado));

  /** Pasos del seguimiento; si se canceló, solo los recorridos y «Cancelado» (como en la web). */
  readonly pasos = computed<EstadoPedido[]>(() => {
    const p = this.pedido();
    if (!p || p.estado !== 'CANCELADO') return RECORRIDO;
    return [...RECORRIDO.filter((e) => this.cambio(p.historialEstados, e)), 'CANCELADO'];
  });

  // Valoraciones (solo pedidos finalizados)
  readonly valoraciones = signal<Record<string, EstadoValoracion>>({});
  readonly productoAValorar = signal<LineaPedido | null>(null);
  readonly puntuacion = signal(5);
  comentario = '';
  readonly enviandoValoracion = signal(false);
  readonly errorValoracion = signal('');
  readonly estrellas = [1, 2, 3, 4, 5];

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, closeOutline, ellipseOutline, locationOutline, star, starOutline });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pedidosApi.consultarDetalle(this.id).subscribe({
      next: (p) => {
        this.mostrar(p);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorPedido(e, 'consulta'));
      }
    });
  }

  private mostrar(p: PedidoCliente): void {
    this.pedido.set(p);
    this.valoraciones.set({});
    if (p.estado === 'FINALIZADO') {
      for (const productoId of new Set(p.lineas.map((l) => l.productoId))) this.consultarValoracion(productoId);
    }
  }

  cambio(historial: CambioEstadoPedido[], estado: EstadoPedido): CambioEstadoPedido | undefined {
    return historial.find((c) => c.estado === estado);
  }

  // --- Cancelar y confirmar recepción ---

  async confirmarCancelacion(): Promise<void> {
    const p = this.pedido();
    if (!p || this.operando() || !puedeCancelar(p.estado)) return;
    const alerta = await this.alertas.create({
      header: 'Cancelar pedido',
      message: `¿Quieres cancelar el pedido #${referenciaPedido(p.id)}?`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Cancelar pedido', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.cancelar() }
      ]
    });
    await alerta.present();
  }

  private cancelar(): void {
    this.operando.set('cancelar');
    this.pedidosApi.cancelar(this.id).subscribe({
      next: (p) => {
        this.operando.set(null);
        this.mostrar(p);
        this.aviso(`El pedido #${referenciaPedido(p.id)} se ha cancelado correctamente.`);
      },
      error: (e: HttpErrorResponse) => {
        this.operando.set(null);
        this.aviso(mensajeErrorPedido(e, 'cancelar'), true);
      }
    });
  }

  async confirmarRecepcionPedido(): Promise<void> {
    const p = this.pedido();
    if (!p || this.operando() || !puedeConfirmarRecepcion(p.estado)) return;
    const alerta = await this.alertas.create({
      header: 'Confirmar recepción',
      message: `¿Confirmas que has recibido el pedido #${referenciaPedido(p.id)}?`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Sí, lo he recibido', handler: () => this.confirmarRecepcion() }
      ]
    });
    await alerta.present();
  }

  private confirmarRecepcion(): void {
    this.operando.set('recepcion');
    this.pedidosApi.confirmarRecepcion(this.id).subscribe({
      next: (p) => {
        this.operando.set(null);
        this.mostrar(p);
        this.aviso(`El pedido #${referenciaPedido(p.id)} se ha finalizado correctamente. Ya puedes valorar sus productos.`);
      },
      error: (e: HttpErrorResponse) => {
        this.operando.set(null);
        this.aviso(mensajeErrorPedido(e, 'recepcion'), true);
      }
    });
  }

  // --- Valoraciones ---

  estadoValoracion(productoId: string): EstadoValoracion | undefined {
    return this.valoraciones()[productoId];
  }

  consultarValoracion(productoId: string): void {
    this.fijarValoracion(productoId, { estado: 'cargando', mensaje: '' });
    this.pedidosApi.consultarEstadoValoracion(this.id, productoId).subscribe({
      next: ({ valorada }) => this.fijarValoracion(productoId, { estado: valorada ? 'valorada' : 'pendiente', mensaje: '' }),
      error: (e: HttpErrorResponse) =>
        this.fijarValoracion(productoId, { estado: 'error', mensaje: mensajeErrorPedido(e, 'valoracion') })
    });
  }

  abrirValoracion(linea: LineaPedido): void {
    if (this.estadoValoracion(linea.productoId)?.estado !== 'pendiente') return;
    this.puntuacion.set(5);
    this.comentario = '';
    this.errorValoracion.set('');
    this.productoAValorar.set(linea);
  }

  cerrarValoracion(): void {
    this.productoAValorar.set(null);
  }

  textoPuntuacion(n: number): string {
    return ['', 'Muy malo', 'Malo', 'Normal', 'Bueno', 'Excelente'][n] ?? '';
  }

  enviarValoracion(): void {
    const linea = this.productoAValorar();
    const p = this.pedido();
    if (!linea || !p || p.estado !== 'FINALIZADO' || this.enviandoValoracion()) return;
    if (this.comentario.length > 500) {
      this.errorValoracion.set('El comentario no puede superar los 500 caracteres.');
      return;
    }
    this.enviandoValoracion.set(true);
    this.errorValoracion.set('');
    this.pedidosApi
      .valorarProducto(p.id, linea.productoId, { puntuacion: this.puntuacion(), comentario: this.comentario.trim() })
      .subscribe({
        next: () => {
          this.enviandoValoracion.set(false);
          this.fijarValoracion(linea.productoId, { estado: 'valorada', mensaje: '' });
          this.productoAValorar.set(null);
          this.aviso('¡Gracias! Tu valoración se ha guardado.');
        },
        error: (e: HttpErrorResponse) => {
          this.enviandoValoracion.set(false);
          this.errorValoracion.set(mensajeErrorPedido(e, 'valoracion'));
          if (e.status === 409) this.fijarValoracion(linea.productoId, { estado: 'valorada', mensaje: '' });
        }
      });
  }

  private fijarValoracion(productoId: string, estado: EstadoValoracion): void {
    this.valoraciones.update((v) => ({ ...v, [productoId]: estado }));
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
