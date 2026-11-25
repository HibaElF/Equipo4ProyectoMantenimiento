import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  cardOutline,
  checkmarkCircle,
  homeOutline,
  warningOutline
} from 'ionicons/icons';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Carrito } from '../../core/models/carrito';
import { Direccion, textoDireccion } from '../../core/models/direccion';
import { MetodoPago } from '../../core/models/metodo-pago';
import { Compra, CrearPedidoRequest, Pedido, textoEstadoPedido, vendedoresPedido } from '../../core/models/pedido';
import { CarritoService } from '../../core/services/carrito.service';
import { CheckoutService, mensajeErrorCheckout } from '../../core/services/checkout.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { PagosService } from '../../core/services/pagos.service';
import { FormularioDireccionComponent } from '../../shared/formulario-direccion/formulario-direccion.component';
import { FormularioMetodoPagoComponent } from '../../shared/formulario-metodo-pago/formulario-metodo-pago.component';

/** Confirmar compra: mismo flujo que la web (dirección, método de pago, pago simulado y confirmación). */
@Component({
  selector: 'app-checkout',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css'
})
export class CheckoutPage {
  private readonly auth = inject(AuthService);
  private readonly carritoApi = inject(CarritoService);
  private readonly direccionesApi = inject(DireccionesService);
  private readonly pagosApi = inject(PagosService);
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  private readonly modales = inject(ModalController);

  private readonly email = signal('');
  readonly carrito = signal<Carrito | null>(null);
  readonly direcciones = signal<Direccion[]>([]);
  readonly metodos = signal<MetodoPago[]>([]);
  readonly direccionId = signal('');
  readonly metodoPagoId = signal('');
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly error = signal('');
  /** Pago iniciado cuyo resultado no se pudo confirmar (se reintenta con el mismo identificador). */
  readonly pendiente = signal<CrearPedidoRequest | null>(null);
  readonly compra = signal<Compra | null>(null);

  readonly textoDireccion = textoDireccion;
  readonly textoEstado = textoEstadoPedido;
  readonly vendedores = vendedoresPedido;

  readonly puedePagar = computed(
    () =>
      !this.cargando() &&
      !this.procesando() &&
      !this.compra() &&
      !!this.email() &&
      (!!this.pendiente() ||
        (!!this.carrito()?.productos.length &&
          this.carrito()!.productos.every((l) => l.disponible) &&
          this.direcciones().some((d) => d.id === this.direccionId()) &&
          this.metodos().some((m) => m.id === this.metodoPagoId())))
  );

  readonly motivoPagoDesactivado = computed(() => {
    const carrito = this.carrito();
    if (this.puedePagar() || this.cargando() || this.procesando() || this.compra() || this.pendiente() || !carrito) {
      return '';
    }
    if (carrito.productos.some((l) => !l.disponible)) {
      return 'Hay productos no disponibles: revísalos en el carrito antes de pagar.';
    }
    const faltaDireccion = !this.direcciones().some((d) => d.id === this.direccionId());
    const faltaMetodo = !this.metodos().some((m) => m.id === this.metodoPagoId());
    if (faltaDireccion && faltaMetodo) return 'Elige una dirección de envío y un método de pago.';
    if (faltaDireccion) return 'Elige una dirección de envío.';
    if (faltaMetodo) return 'Elige un método de pago.';
    return '';
  });

  readonly numeroVendedores = computed(
    () => new Set((this.carrito()?.productos ?? []).map((l) => l.vendedor).filter(Boolean)).size
  );

  constructor() {
    addIcons({ addOutline, alertCircleOutline, cardOutline, checkmarkCircle, homeOutline, warningOutline });
    this.cargar();
  }

  cargar(limpiarError = true): void {
    if (this.cargando() || this.procesando() || this.compra()) return;
    this.cargando.set(true);
    if (limpiarError) this.error.set('');
    this.auth.obtenerSesionActual().subscribe({
      next: (sesion) => {
        if (sesion.role !== 'CLIENTE') {
          this.cargando.set(false);
          this.error.set('Solo los clientes pueden realizar compras.');
          return;
        }
        try {
          const pendiente = this.checkout.obtenerOperacion(sesion.email);
          this.pendiente.set(pendiente);
          if (pendiente) {
            this.direccionId.set(pendiente.direccionId);
            this.metodoPagoId.set(pendiente.metodoPagoId);
          }
          this.email.set(sesion.email);
        } catch {
          this.cargando.set(false);
          this.error.set('No se pudo recuperar la compra pendiente en este dispositivo. Inténtalo de nuevo.');
          return;
        }
        forkJoin({
          carrito: this.carritoApi.consultar(),
          direcciones: this.direccionesApi.consultar(),
          metodos: this.pagosApi.consultarMetodos()
        }).subscribe({
          next: (datos) => {
            this.carrito.set(datos.carrito);
            this.direcciones.set(datos.direcciones);
            this.metodos.set(datos.metodos);
            // Comodidad móvil: si solo hay una opción, queda elegida.
            if (!this.direccionId() && datos.direcciones.length === 1) this.direccionId.set(datos.direcciones[0].id);
            if (!this.metodoPagoId() && datos.metodos.length === 1) this.metodoPagoId.set(datos.metodos[0].id);
            this.cargando.set(false);
          },
          error: (e: HttpErrorResponse) => {
            this.carrito.set(null);
            this.cargando.set(false);
            this.error.set(
              mensajeErrorCheckout(e, 'No se pudieron cargar los datos de compra. Inténtalo de nuevo.', !!this.pendiente())
            );
          }
        });
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorCheckout(e, 'No se pudo comprobar tu sesión. Inténtalo de nuevo.', false));
      }
    });
  }

  pagar(): void {
    if (!this.puedePagar()) return;
    let request = this.pendiente();
    if (!request) {
      try {
        request = {
          direccionId: this.direccionId(),
          metodoPagoId: this.metodoPagoId(),
          operacionId: this.checkout.nuevoIdentificador()
        };
        this.checkout.guardarOperacion(this.email(), request);
        this.pendiente.set(request);
      } catch {
        this.error.set('No se pudo preparar la compra en este dispositivo. Inténtalo de nuevo.');
        return;
      }
    }
    this.procesando.set(true);
    this.error.set('');
    this.checkout.pagar(request).subscribe({
      next: (compra) => {
        this.compra.set(compra);
        this.procesando.set(false);
        this.checkout.limpiarOperacion(this.email());
        this.pendiente.set(null);
      },
      error: (e: HttpErrorResponse) => {
        // Un 400 es un rechazo definitivo (no se cobró): se olvida la operación y se recargan los datos.
        const rechazado = e.status === 400;
        this.procesando.set(false);
        if (rechazado) {
          this.checkout.limpiarOperacion(this.email());
          this.pendiente.set(null);
        }
        this.error.set(
          mensajeErrorCheckout(
            e,
            'No se pudo confirmar la compra. Comprueba el resultado antes de iniciar otra.',
            !!this.pendiente()
          )
        );
        if (rechazado) this.cargar(false);
      }
    });
  }

  /**
   * Las pestañas recuerdan su última pantalla: si se vuelve a Carrito después de comprar,
   * se regresa al carrito en lugar de mostrar otra vez la confirmación.
   */
  ionViewWillEnter(): void {
    if (this.compra()) this.nav.navigateBack('/carrito');
  }

  /** Añade una dirección sin salir de la compra y la deja elegida. */
  async anadirDireccion(): Promise<void> {
    const modal = await this.modales.create({ component: FormularioDireccionComponent });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<Direccion>();
    if (role === 'guardado' && data) {
      this.direcciones.update((ds) => [...ds, data]);
      this.direccionId.set(data.id);
    }
  }

  /** Añade un método de pago sin salir de la compra y lo deja elegido. */
  async anadirMetodo(): Promise<void> {
    const modal = await this.modales.create({ component: FormularioMetodoPagoComponent });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<MetodoPago>();
    if (role === 'guardado' && data) {
      this.metodos.update((ms) => [...ms, data]);
      this.metodoPagoId.set(data.id);
    }
  }

  direccionDe(compra: Compra): Direccion | null {
    return compra.pedidos.find((p: Pedido) => p.direccionEnvio)?.direccionEnvio ?? null;
  }

  irAPedidos(): void {
    this.router.navigateByUrl('/pedidos', { replaceUrl: true });
  }
}
