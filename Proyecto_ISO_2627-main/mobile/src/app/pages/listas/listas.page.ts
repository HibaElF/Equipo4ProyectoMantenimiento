import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
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
import { chevronForwardOutline, closeOutline, heart, listOutline } from 'ionicons/icons';
import { ResumenLista } from '../../core/models/listas';
import { ListasService, MAX_NOMBRE_LISTA, crearControlNombreLista, mensajeErrorListas } from '../../core/services/listas.service';

/**
 * Pestaña Listas: reúne los apartados «Favoritos» y «Mis listas» de la web.
 * Favoritos es la lista predeterminada (♥): aparece la primera y abre la pantalla de favoritos.
 */
import { BotonAlertasComponent } from '../../shared/boton-alertas/boton-alertas.component';

@Component({
  selector: 'app-listas',
  imports: [
    BotonAlertasComponent,
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './listas.page.html',
  styleUrl: './listas.page.css'
})
export class ListasPage {
  private readonly listasApi = inject(ListasService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

  readonly listas = signal<ResumenLista[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly creando = signal(false);
  readonly maxNombre = MAX_NOMBRE_LISTA;
  readonly nombreNueva = crearControlNombreLista();

  constructor() {
    addIcons({ chevronForwardOutline, closeOutline, heart, listOutline });
  }

  ionViewWillEnter(): void {
    this.cargar();
  }

  cargar(alTerminar?: () => void): void {
    this.cargando.set(true);
    this.error.set('');
    this.listasApi.consultarListas().subscribe({
      next: (listas) => {
        // La de favoritos siempre primero.
        this.listas.set([...listas].sort((a, b) => Number(b.predeterminada) - Number(a.predeterminada)));
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorListas(e, 'No se pudieron cargar tus listas.'));
        alTerminar?.();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargar(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  crearLista(): void {
    if (this.creando()) return;
    if (this.nombreNueva.invalid) {
      this.nombreNueva.markAsTouched();
      return;
    }
    this.creando.set(true);
    this.listasApi.crearLista(this.nombreNueva.value.trim()).subscribe({
      next: (lista) => {
        this.creando.set(false);
        this.nombreNueva.reset();
        this.listas.update((l) => [
          ...l,
          { id: lista.id, nombre: lista.nombre, predeterminada: lista.predeterminada, productoIds: lista.productos.map((p) => p.id) }
        ]);
        this.aviso(`Lista «${lista.nombre}» creada.`);
      },
      error: (e: HttpErrorResponse) => {
        this.creando.set(false);
        this.aviso(mensajeErrorListas(e, 'No se pudo crear la lista.'), true);
      }
    });
  }

  /** Favoritos abre su propia pantalla (añadir al carrito, quitar de favoritos); el resto, el detalle de la lista. */
  abrirLista(lista: ResumenLista): void {
    this.router.navigate(lista.predeterminada ? ['/listas/favoritos'] : ['/listas', lista.id]);
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
