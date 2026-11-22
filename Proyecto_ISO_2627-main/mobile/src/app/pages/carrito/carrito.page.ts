import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
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
import {
  addOutline,
  alertCircleOutline,
  cartOutline,
  closeOutline,
  imageOutline,
  removeOutline,
  trashOutline,
  warningOutline
} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { Carrito, LineaCarrito } from '../../core/models/carrito';
import { CarritoService, mensajeErrorOperacionCarrito } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto.service';

/** Carrito del cliente: mismas operaciones que la web (cantidades, eliminar, descartar y comprar). */
@Component({
  selector: 'app-carrito',
  imports: [
    DecimalPipe,
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
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
  templateUrl: './carrito.page.html',
  styleUrl: './carrito.page.css'
})
export class CarritoPage {
  private readonly carritoApi = inject(CarritoService);
  private readonly productosApi = inject(ProductoService);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly router = inject(Router);

  readonly carrito = signal<Carrito | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  /** Producto (o 'descarte') que se está actualizando; bloquea el resto de botones mientras tanto. */
  readonly operacion = signal<string | null>(null);
  readonly imagenesFallidas = signal<ReadonlySet<string>>(new Set());

  readonly hayAvisos = computed(() => this.carrito()?.productos.some((l) => !l.disponible) ?? false);
  readonly unidades = computed(() => this.carrito()?.productos.reduce((t, l) => t + l.cantidad, 0) ?? 0);

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      cartOutline,
      closeOutline,
      imageOutline,
      removeOutline,
      trashOutline,
      warningOutline
    });
  }

  /** Se recarga cada vez que se entra en la pestaña (el carrito puede cambiar desde el catálogo). */
  ionViewWillEnter(): void {
    this.cargarCarrito();
  }

  cargarCarrito(alTerminar?: () => void): void {
    if (this.operacion() !== null) {
      alTerminar?.();
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.carritoApi.consultar().subscribe({
      next: (c) => {
        this.carrito.set(c);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorOperacionCarrito(e, 'No se pudo cargar el carrito. Inténtalo de nuevo.'));
        alTerminar?.();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargarCarrito(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  urlImagen(linea: LineaCarrito): string | null {
    return linea.imagen && !this.imagenesFallidas().has(linea.productoId)
      ? this.productosApi.urlImagen(linea.imagen)
      : null;
  }

  marcarImagenFallida(productoId: string): void {
    this.imagenesFallidas.update((s) => new Set([...s, productoId]));
  }

  /** Igual que la web: se puede cambiar la cantidad si hay stock (aunque la cantidad actual lo supere). */
  puedeModificar(linea: LineaCarrito): boolean {
    return (
      (linea.stock ?? 0) > 0 &&
      (linea.disponible || linea.aviso === 'No hay stock suficiente para la cantidad solicitada.')
    );
  }

  ajustarCantidad(linea: LineaCarrito, cambio: number): void {
    if (this.operacion() !== null || !this.puedeModificar(linea)) return;
    const nueva = Math.max(1, Math.min(linea.stock ?? 1, linea.cantidad + cambio));
    if (nueva === linea.cantidad) return;
    this.ejecutar(
      this.carritoApi.modificarCantidad(linea.productoId, nueva),
      linea.productoId,
      'Cantidad actualizada.',
      'No se pudo modificar la cantidad. Revisa el stock y vuelve a intentarlo.',
      true
    );
  }

  eliminar(linea: LineaCarrito): void {
    if (this.operacion() !== null) return;
    this.ejecutar(
      this.carritoApi.eliminarProducto(linea.productoId),
      linea.productoId,
      'Producto eliminado del carrito.',
      'No se pudo eliminar el producto. Inténtalo de nuevo.',
      true
    );
  }

  async confirmarDescarte(): Promise<void> {
    if (this.operacion() !== null || !this.carrito()?.productos.length) return;
    const alerta = await this.alertas.create({
      header: 'Descartar el carrito',
      message: 'Se eliminarán todos los productos del carrito.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Descartar carrito',
          role: 'destructive',
          cssClass: 'boton-peligro',
          handler: () =>
            this.ejecutar(
              this.carritoApi.vaciar(),
              'descarte',
              'Carrito descartado.',
              'No se pudo descartar el carrito. Inténtalo de nuevo.'
            )
        }
      ]
    });
    await alerta.present();
  }

  comprar(): void {
    if (this.operacion() !== null || !this.carrito()?.productos.length || this.hayAvisos()) return;
    this.router.navigate(['/carrito/checkout']);
  }

  private ejecutar(
    peticion: Observable<Carrito>,
    operacion: string,
    exito: string,
    porDefecto: string,
    deLinea = false
  ): void {
    this.operacion.set(operacion);
    peticion.subscribe({
      next: (c) => {
        this.carrito.set(c);
        this.operacion.set(null);
        this.aviso(exito);
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(null);
        this.aviso(mensajeErrorOperacionCarrito(e, porDefecto, deLinea), true);
        // Tras un error se recarga para mostrar el estado real del carrito.
        if (e.status !== 401) this.cargarCarrito();
      }
    });
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 3500 : 1800,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
