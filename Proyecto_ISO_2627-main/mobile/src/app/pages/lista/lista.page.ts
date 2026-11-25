import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, createOutline, heart, imageOutline, trashOutline } from 'ionicons/icons';
import { ProductoFavorito } from '../../core/models/favoritos';
import { ListaProductos } from '../../core/models/listas';
import { ListasService, MAX_NOMBRE_LISTA, crearControlNombreLista, mensajeErrorListas } from '../../core/services/listas.service';
import { ProductoService } from '../../core/services/producto.service';

/** Detalle de una lista: renombrar, eliminar y quitar productos (como en «Mis listas» de la web). */
@Component({
  selector: 'app-lista',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './lista.page.html',
  styleUrl: './lista.page.css'
})
export class ListaPage {
  private readonly listasApi = inject(ListasService);
  private readonly productosApi = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly lista = signal<ListaProductos | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  /** Hay una operación en curso (renombrar, eliminar o quitar un producto). */
  readonly operacion = signal(false);
  readonly quitando = signal<string | null>(null);
  readonly renombrando = signal(false);
  readonly maxNombre = MAX_NOMBRE_LISTA;
  readonly nombreRenombrar = crearControlNombreLista();

  constructor() {
    addIcons({ closeOutline, createOutline, heart, imageOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.listasApi.consultarLista(this.id).subscribe({
      next: (l) => {
        this.lista.set(l);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorListas(e, 'No se pudo cargar la lista.'));
      }
    });
  }

  iniciarRenombrar(): void {
    const l = this.lista();
    if (!l || l.predeterminada) return;
    this.nombreRenombrar.setValue(l.nombre);
    this.renombrando.set(true);
  }

  cancelarRenombrar(): void {
    this.renombrando.set(false);
  }

  renombrar(): void {
    const l = this.lista();
    if (!l || this.operacion()) return;
    if (this.nombreRenombrar.invalid) {
      this.nombreRenombrar.markAsTouched();
      return;
    }
    this.operacion.set(true);
    this.listasApi.renombrarLista(l.id, this.nombreRenombrar.value.trim()).subscribe({
      next: (renombrada) => {
        this.operacion.set(false);
        this.renombrando.set(false);
        this.lista.set(renombrada);
        this.aviso(`Lista renombrada a «${renombrada.nombre}».`);
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(false);
        this.aviso(mensajeErrorListas(e, 'No se pudo renombrar la lista.'), true);
      }
    });
  }

  async confirmarEliminar(): Promise<void> {
    const l = this.lista();
    if (!l || l.predeterminada || this.operacion()) return;
    const alerta = await this.alertas.create({
      header: 'Eliminar lista',
      message: `¿Eliminar la lista «${l.nombre}»? Sus productos seguirán en el catálogo.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar lista', role: 'destructive', cssClass: 'boton-peligro', handler: () => this.eliminar(l) }
      ]
    });
    await alerta.present();
  }

  private eliminar(l: ListaProductos): void {
    this.operacion.set(true);
    this.listasApi.eliminarLista(l.id).subscribe({
      next: () => {
        this.operacion.set(false);
        this.aviso(`Lista «${l.nombre}» eliminada.`);
        this.nav.navigateBack('/listas');
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(false);
        this.aviso(mensajeErrorListas(e, 'No se pudo eliminar la lista.'), true);
      }
    });
  }

  quitarProducto(producto: ProductoFavorito): void {
    const l = this.lista();
    if (!l || this.operacion()) return;
    this.operacion.set(true);
    this.quitando.set(producto.id);
    this.listasApi.quitarProducto(l.id, producto.id).subscribe({
      next: (actualizada) => {
        this.operacion.set(false);
        this.quitando.set(null);
        this.lista.set(actualizada);
        this.aviso('Producto quitado de la lista.');
      },
      error: (e: HttpErrorResponse) => {
        this.operacion.set(false);
        this.quitando.set(null);
        this.aviso(mensajeErrorListas(e, 'No se pudo quitar el producto de la lista.'), true);
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
