import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonModal,
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
  heart,
  heartOutline,
  imageOutline,
  listOutline,
  removeOutline
} from 'ionicons/icons';
import { ResumenLista } from '../../core/models/listas';
import { ProductoCatalogo, ValoracionesProducto, puedeConsultarDetalle } from '../../core/models/producto';
import { CarritoService, mensajeErrorCarrito } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ListasService } from '../../core/services/listas.service';
import { ProductoService } from '../../core/services/producto.service';
import { EstrellasComponent } from '../../shared/estrellas/estrellas.component';

/**
 * Ficha del producto: lo mismo que el detalle de la web (precio, descuentos, vendedor, stock,
 * valoraciones, favoritos, listas y añadir al carrito con cantidad).
 */
@Component({
  selector: 'app-producto',
  imports: [
    DecimalPipe,
    EstrellasComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonModal,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './producto.page.html',
  styleUrl: './producto.page.css'
})
export class ProductoPage {
  private readonly route = inject(ActivatedRoute);
  private readonly productosApi = inject(ProductoService);
  private readonly favoritosApi = inject(FavoritosService);
  private readonly listasApi = inject(ListasService);
  private readonly carritoApi = inject(CarritoService);
  private readonly toasts = inject(ToastController);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  // Producto
  readonly producto = signal<ProductoCatalogo | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly imagenFallida = signal(false);
  readonly imagen = computed(() => {
    const img = this.producto()?.imagen;
    return img && !this.imagenFallida() ? this.productosApi.urlImagen(img) : null;
  });
  readonly hayRebaja = computed(() => {
    const p = this.producto();
    return !!p && p.precio !== null && p.precioOriginal !== null && p.precioOriginal > p.precio;
  });

  // Valoraciones
  readonly valoraciones = signal<ValoracionesProducto | null>(null);
  readonly cargandoValoraciones = signal(false);
  readonly errorValoraciones = signal('');

  // Compra
  readonly cantidad = signal(1);
  readonly anadiendo = signal(false);
  readonly puedeComprar = computed(() => {
    const p = this.producto();
    return !!p && puedeConsultarDetalle(p) && p.esVisible && p.stock > 0 && p.precio !== null;
  });

  // Favoritos
  readonly esFavorito = signal(false);
  readonly favoritosDisponibles = signal(false);
  readonly cambiandoFavorito = signal(false);

  // Listas (solo las creadas por el cliente; Favoritos tiene su botón, como en la web)
  private readonly listas = signal<ResumenLista[]>([]);
  readonly listasPersonales = computed(() => this.listas().filter((l) => !l.predeterminada));
  readonly listasConProducto = computed(
    () => this.listasPersonales().filter((l) => l.productoIds.includes(this.id)).length
  );
  readonly panelListas = signal(false);
  private readonly router = inject(Router);
  readonly cargandoListas = signal(false);
  readonly errorListas = signal('');
  readonly modificandoLista = signal<string | null>(null);

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      cartOutline,
      closeOutline,
      heart,
      heartOutline,
      imageOutline,
      listOutline,
      removeOutline
    });
    this.cargarProducto();
    this.cargarFavoritos();
    this.cargarListas();
  }

  cargarProducto(): void {
    this.cargando.set(true);
    this.error.set('');
    this.productosApi.consultarDetalle(this.id).subscribe({
      next: (p) => {
        this.producto.set(p);
        this.cantidad.set(1);
        this.cargando.set(false);
        this.cargarValoraciones();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          e.status === 403
            ? 'Este producto es solo para clientes Premium.'
            : e.status === 404
              ? 'Este producto ya no está disponible.'
              : e.status === 0
                ? 'No se pudo conectar con el servicio. Inténtalo de nuevo.'
                : 'No se pudo cargar el detalle del producto. Inténtalo de nuevo.'
        );
      }
    });
  }

  cargarValoraciones(): void {
    this.cargandoValoraciones.set(true);
    this.errorValoraciones.set('');
    this.productosApi.consultarValoraciones(this.id).subscribe({
      next: (v) => {
        this.valoraciones.set(v);
        this.cargandoValoraciones.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoValoraciones.set(false);
        this.errorValoraciones.set(
          e.status === 0
            ? 'No se pudieron cargar las valoraciones. Comprueba tu conexión e inténtalo de nuevo.'
            : 'No se pudieron cargar las valoraciones de este producto.'
        );
      }
    });
  }

  // --- Cantidad y carrito ---

  reducir(): void {
    this.cantidad.update((c) => Math.max(1, c - 1));
  }

  aumentar(): void {
    const stock = this.producto()?.stock ?? 1;
    this.cantidad.update((c) => Math.min(stock, c + 1));
  }

  anadirAlCarrito(): void {
    const p = this.producto();
    if (!p || this.anadiendo()) return;
    const cantidad = this.cantidad();
    if (cantidad > p.stock) {
      this.aviso('No hay stock suficiente para la cantidad solicitada.', true);
      return;
    }
    this.anadiendo.set(true);
    this.carritoApi.anadirProducto(p.id, cantidad).subscribe({
      next: (carrito) => {
        this.anadiendo.set(false);
        this.aviso(`Producto añadido al carrito. Importe del carrito: ${this.euros(carrito.importe)} €.`);
      },
      error: (e: HttpErrorResponse) => {
        this.anadiendo.set(false);
        this.aviso(mensajeErrorCarrito(e), true);
      }
    });
  }

  // --- Favoritos ---

  private cargarFavoritos(): void {
    this.favoritosApi.consultar().subscribe({
      next: (r) => {
        this.esFavorito.set(r.ids.includes(this.id));
        this.favoritosDisponibles.set(true);
      },
      error: () => this.favoritosDisponibles.set(false)
    });
  }

  alternarFavorito(): void {
    if (!this.favoritosDisponibles() || this.cambiandoFavorito()) return;
    const yaGuardado = this.esFavorito();
    this.cambiandoFavorito.set(true);
    (yaGuardado ? this.favoritosApi.quitar(this.id) : this.favoritosApi.anadir(this.id)).subscribe({
      next: (r) => {
        this.esFavorito.set(r.ids.includes(this.id));
        this.cambiandoFavorito.set(false);
        this.aviso(yaGuardado ? 'Producto eliminado de favoritos.' : 'Producto guardado en favoritos.');
      },
      error: () => {
        this.cambiandoFavorito.set(false);
        this.aviso('No se pudo actualizar tus favoritos.', true);
      }
    });
  }

  // --- Listas ---

  cargarListas(): void {
    this.cargandoListas.set(true);
    this.errorListas.set('');
    this.listasApi.consultarListas().subscribe({
      next: (listas) => {
        this.listas.set(listas);
        this.cargandoListas.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoListas.set(false);
        this.errorListas.set(
          e.status === 0 ? 'No se pudo conectar con el servicio de listas.' : 'No se pudieron consultar tus listas.'
        );
      }
    });
  }

  estaEnLista(lista: ResumenLista): boolean {
    return lista.productoIds.includes(this.id);
  }

  alternarEnLista(lista: ResumenLista): void {
    if (this.modificandoLista()) return;
    const yaIncluido = this.estaEnLista(lista);
    this.modificandoLista.set(lista.id);
    (yaIncluido ? this.listasApi.quitarProducto(lista.id, this.id) : this.listasApi.anadirProducto(lista.id, this.id)).subscribe({
      next: (actualizada) => {
        const productoIds = actualizada.productos.map((p) => p.id);
        this.listas.update((ls) => ls.map((l) => (l.id === actualizada.id ? { ...l, productoIds } : l)));
        this.modificandoLista.set(null);
        this.aviso(yaIncluido ? `Quitado de «${lista.nombre}».` : `Añadido a «${lista.nombre}».`);
      },
      error: () => {
        this.modificandoLista.set(null);
        this.aviso('No se pudo actualizar la lista. Inténtalo de nuevo.', true);
      }
    });
  }

  // --- Utilidades ---

  private euros(valor: number): string {
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 3500 : 2000,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }

  irAMisListas(): void {
    this.panelListas.set(false);
    this.router.navigate(['/listas']);
  }
}
