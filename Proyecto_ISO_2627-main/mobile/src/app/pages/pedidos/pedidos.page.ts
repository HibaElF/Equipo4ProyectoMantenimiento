import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, receiptOutline } from 'ionicons/icons';
import { PedidoCliente, referenciaPedido, vendedoresPedido } from '../../core/models/pedido';
import { PedidosService, mensajeErrorPedido } from '../../core/services/pedidos.service';
import { EstadoPedidoComponent } from '../../shared/estado-pedido/estado-pedido.component';

type Vista = 'activos' | 'historico';

/** Mis pedidos: activos e historial (incluidos los cancelados), como en la web. */
import { BotonAlertasComponent } from '../../shared/boton-alertas/boton-alertas.component';

@Component({
  selector: 'app-pedidos',
  imports: [
    BotonAlertasComponent,
    DatePipe,
    DecimalPipe,
    EstadoPedidoComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonSkeletonText,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './pedidos.page.html',
  styleUrl: './pedidos.page.css'
})
export class PedidosPage {
  private readonly pedidosApi = inject(PedidosService);
  private readonly router = inject(Router);

  readonly vista = signal<Vista>('activos');
  readonly activos = signal<PedidoCliente[]>([]);
  readonly historico = signal<PedidoCliente[]>([]);
  readonly cargandoActivos = signal(true);
  readonly cargandoHistorico = signal(true);
  readonly errorActivos = signal('');
  readonly errorHistorico = signal('');

  readonly pedidos = computed(() => (this.vista() === 'activos' ? this.activos() : this.historico()));
  readonly cargando = computed(() => (this.vista() === 'activos' ? this.cargandoActivos() : this.cargandoHistorico()));
  readonly error = computed(() => (this.vista() === 'activos' ? this.errorActivos() : this.errorHistorico()));

  readonly referencia = referenciaPedido;
  readonly vendedores = vendedoresPedido;

  constructor() {
    addIcons({ chevronForwardOutline, receiptOutline });
  }

  /** Se recarga al entrar (tras comprar, cancelar o confirmar la recepción). */
  ionViewWillEnter(): void {
    this.cargar();
  }

  cambiarVista(valor: string | number | undefined): void {
    this.vista.set(valor === 'historico' ? 'historico' : 'activos');
  }

  cargar(alTerminar?: () => void): void {
    let pendientes = 2;
    const terminar = () => {
      if (--pendientes === 0) alTerminar?.();
    };
    this.cargandoActivos.set(true);
    this.cargandoHistorico.set(true);
    this.errorActivos.set('');
    this.errorHistorico.set('');
    this.pedidosApi.consultarActivos().subscribe({
      next: (p) => {
        this.activos.set(p);
        this.cargandoActivos.set(false);
        terminar();
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoActivos.set(false);
        this.errorActivos.set(mensajeErrorPedido(e, 'consulta'));
        terminar();
      }
    });
    this.pedidosApi.consultarHistorico().subscribe({
      next: (p) => {
        this.historico.set(p);
        this.cargandoHistorico.set(false);
        terminar();
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoHistorico.set(false);
        this.errorHistorico.set(mensajeErrorPedido(e, 'consulta'));
        terminar();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargar(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  abrir(pedido: PedidoCliente): void {
    this.router.navigate(['/pedidos', pedido.id]);
  }

  unidades(pedido: PedidoCliente): number {
    return pedido.lineas.reduce((t, l) => t + l.cantidad, 0);
  }
}
