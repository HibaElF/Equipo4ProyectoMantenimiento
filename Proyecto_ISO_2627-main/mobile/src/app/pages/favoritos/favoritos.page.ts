import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
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
import { closeOutline, heartOutline, imageOutline } from 'ionicons/icons';
import { ProductoFavorito } from '../../core/models/favoritos';
import { CarritoService, mensajeErrorOperacionCarrito } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ProductoService } from '../../core/services/producto.service';

/** Mensajes de la web para favoritos. */
export function mensajeErrorFavoritos(error: HttpErrorResponse, porDefecto: string): string {
  if (error.status === 401) return 'Tu sesión ha caducado.';
  if (error.status === 0) return 'No se pudo conectar con el servidor.';
  if (error.status === 409) return 'Los favoritos se han modificado. Recarga la lista e inténtalo de nuevo.';
  return porDefecto;
}

/**
 * Favoritos (lista predeterminada ♥), dentro de la pestaña Listas. Mismas opciones que
 * el apartado «Favoritos» de la web: añadir al carrito y quitar de favoritos.
 */
@Component({
  selector: 'app-favoritos',
  imports: [
    DecimalPipe,
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
  templateUrl: './favoritos.page.html',
  styleUrl: './favoritos.page.css'
})
export class FavoritosPage {
  private readonly favoritosApi = inject(FavoritosService);
  private readonly carritoApi = inject(CarritoService);
  private readonly productosApi = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

  readonly productos = signal<ProductoFavorito[]>([]);
  readonly cargandoFavoritos = signal(true);
  readonly errorFavoritos = signal('');
  /** Producto con una operación en curso (añadir al carrito o quitar). */
  readonly operacion = signal<string | null>(null);

  constructor() {
    addIcons({ closeOutline, heartOutline, imageOutline });
  }

  ionViewWillEnter(): void {
    this.cargarFavoritos();
  }

  recargar(evento: CustomEvent): void {
    this.cargarFavoritos(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  cargarFavoritos(alTerminar?: () => void): void {
    this.cargandoFavoritos.set(true);
    this.errorFavoritos.set('');
    this.favoritosApi.consultar().subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.cargandoFavoritos.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoFavoritos.set(false);
        this.errorFavoritos.set(mensajeErrorFavoritos(e, 'No se pudieron cargar tus favoritos.'));
        alTerminar?.();
      }
    });
  }

  quitarFavorito(producto: ProductoFavorito): void {
    if (this.operacion() !== null) return;
    this.operacion.set(producto.id);
    this.favoritosApi.quitar(producto.id).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.operacion.set(null);
        this.aviso('Producto eliminado de favoritos.');
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(null);
        this.aviso(mensajeErrorFavoritos(e, 'No se pudo quitar el producto de favoritos.'), true);
      }
    });
  }

  anadirAlCarrito(producto: ProductoFavorito): void {
    if (this.operacion() !== null || !producto.disponible) return;
    this.operacion.set(producto.id);
    this.carritoApi.anadirProducto(producto.id, 1).subscribe({
      next: () => {
        this.operacion.set(null);
        this.aviso(`"${producto.nombre}" añadido al carrito.`);
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(null);
        this.aviso(mensajeErrorOperacionCarrito(e, 'No se pudo añadir el producto al carrito.'), true);
      }
    });
  }

  verProducto(producto: ProductoFavorito): void {
    this.router.navigate(['/tienda/producto', producto.id]);
  }

  urlImagen(imagen: string): string {
    return this.productosApi.urlImagen(imagen);
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
