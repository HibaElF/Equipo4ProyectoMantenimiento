import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, optionsOutline, refreshOutline, star, starOutline } from 'ionicons/icons';
import { CategoriaFavorita, claveCategoria } from '../../core/models/categoria-favorita';
import { FiltrosCatalogo, ProductoCatalogo } from '../../core/models/producto';
import { CarritoService, mensajeErrorCarrito } from '../../core/services/carrito.service';
import {
  CategoriasFavoritasService,
  mensajeErrorCategoriaFavorita
} from '../../core/services/categorias-favoritas.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ProductoService } from '../../core/services/producto.service';
import { TarjetaProductoComponent } from '../../shared/tarjeta-producto/tarjeta-producto.component';

type Disponibilidad = 'todos' | 'disponibles' | 'agotados';

/**
 * Catálogo del cliente: mismas funciones que la web (buscar, categoría, precio,
 * disponibilidad, solo favoritos, favoritos y añadir al carrito), en rejilla de dos columnas.
 */
import { AvisoSegundoFactorComponent } from '../../shared/aviso-segundo-factor/aviso-segundo-factor.component';
import { BotonAlertasComponent } from '../../shared/boton-alertas/boton-alertas.component';

@Component({
  selector: 'app-tienda',
  imports: [
    AvisoSegundoFactorComponent,
    BotonAlertasComponent,
    FormsModule,
    TarjetaProductoComponent,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar
  ],
  templateUrl: './tienda.page.html',
  styleUrl: './tienda.page.css'
})
export class TiendaPage implements OnDestroy {
  private readonly productosApi = inject(ProductoService);
  private readonly favoritosApi = inject(FavoritosService);
  private readonly categoriasFavoritasApi = inject(CategoriasFavoritasService);
  private readonly carritoApi = inject(CarritoService);
  private readonly toasts = inject(ToastController);
  private readonly router = inject(Router);

  // Catálogo
  readonly productos = signal<ProductoCatalogo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  private readonly categoriasVistas = signal<string[]>([]);
  // Las favoritas siempre aparecen, aunque ahora no haya productos suyos, para poder quitarlas (como en la web).
  readonly categorias = computed(() => {
    const nombres = new Map<string, string>();
    for (const nombre of [...this.categoriasVistas(), ...this.categoriasFavoritas().map((c) => c.nombre)]) {
      const clave = claveCategoria(nombre);
      if (!nombres.has(clave)) nombres.set(clave, nombre);
    }
    return [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es'));
  });

  // Categorías favoritas: el cliente marca la categoría seleccionada con la estrella.
  readonly catalogoCategorias = signal<CategoriaFavorita[]>([]);
  readonly categoriasFavoritas = signal<CategoriaFavorita[]>([]);
  readonly categoriasFavoritasDisponibles = signal(false);
  readonly modificandoCategoriaFavorita = signal(false);
  readonly errorCategoriasFavoritas = signal('');

  /** Id de la categoría seleccionada; null si no hay ninguna o no se conoce. */
  readonly idCategoriaSeleccionada = computed(() => {
    const seleccionada = this.categoria();
    if (!seleccionada) return null;
    const clave = claveCategoria(seleccionada);
    return (
      [...this.categoriasFavoritas(), ...this.catalogoCategorias()].find((c) => claveCategoria(c.nombre) === clave)
        ?.id ?? null
    );
  });

  readonly categoriaSeleccionadaEsFavorita = computed(() => {
    const id = this.idCategoriaSeleccionada();
    return id !== null && this.categoriasFavoritas().some((c) => c.id === id);
  });

  readonly etiquetaCategoriaFavorita = computed(() => {
    const nombre = this.categoria();
    if (!nombre) return 'Selecciona una categoría para marcarla como favorita';
    return this.categoriaSeleccionadaEsFavorita()
      ? `Quitar ${nombre} de categorías favoritas`
      : `Marcar ${nombre} como categoría favorita`;
  });

  // Filtros (los mismos que la web)
  readonly busqueda = signal('');
  readonly categoria = signal('');
  readonly disponibilidad = signal<Disponibilidad>('todos');
  readonly soloFavoritos = signal(false);
  readonly precioMinimo = signal('');
  readonly precioMaximo = signal('');
  readonly panelFiltros = signal(false);
  readonly errorFiltros = signal('');
  // Valores del panel mientras se editan; se aplican al pulsar «Aplicar».
  borradorMinimo = '';
  borradorMaximo = '';
  borradorDisponibilidad: Disponibilidad = 'todos';
  borradorSoloFavoritos = false;

  readonly numeroFiltrosPanel = computed(
    () =>
      [this.precioMinimo() !== '', this.precioMaximo() !== '', this.disponibilidad() !== 'todos', this.soloFavoritos()]
        .filter(Boolean).length
  );
  readonly hayFiltros = computed(
    () => this.busqueda().trim() !== '' || this.categoria() !== '' || this.numeroFiltrosPanel() > 0
  );

  // Favoritos y carrito
  readonly idsFavoritos = signal<ReadonlySet<string>>(new Set());
  readonly favoritosDisponibles = signal(false);
  readonly cambiandoFavorito = signal<string | null>(null);
  readonly anadiendo = signal<string | null>(null);

  readonly productosMostrados = computed(() =>
    this.soloFavoritos() ? this.productos().filter((p) => this.idsFavoritos().has(p.id)) : this.productos()
  );
  readonly esqueletos = Array.from({ length: 6 });

  private temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    addIcons({ optionsOutline, closeOutline, refreshOutline, star, starOutline });
    this.cargarProductos();
    this.cargarCategoriasFavoritas();
  }

  /** Ionic conserva la pantalla entre pestañas: al volver se actualizan los favoritos. */
  ionViewWillEnter(): void {
    this.cargarFavoritos();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorBusqueda);
  }

  cargarProductos(alTerminar?: () => void): void {
    this.cargando.set(true);
    this.error.set('');
    this.productosApi.consultarCatalogo(this.filtros()).subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.categoriasVistas.update((actuales) => [
          ...new Set([...actuales, ...productos.map((p) => p.categoria).filter(Boolean)])
        ]);
        this.cargando.set(false);
        alTerminar?.();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          e.status === 0
            ? 'No se pudo conectar con el servicio. Inténtalo de nuevo.'
            : 'No se pudo cargar el catálogo. Inténtalo de nuevo.'
        );
        alTerminar?.();
      }
    });
  }

  recargar(evento: CustomEvent): void {
    this.cargarFavoritos();
    this.cargarCategoriasFavoritas();
    this.cargarProductos(() => (evento.target as HTMLIonRefresherElement).complete());
  }

  private filtros(): FiltrosCatalogo {
    const min = this.precioMinimo().trim();
    const max = this.precioMaximo().trim();
    const disp = this.disponibilidad();
    return {
      nombre: this.busqueda().trim() || undefined,
      categoria: this.categoria() || undefined,
      precioMinimo: min === '' ? undefined : Number(min),
      precioMaximo: max === '' ? undefined : Number(max),
      disponible: disp === 'todos' ? undefined : disp === 'disponibles'
    };
  }

  // --- Búsqueda y categoría (se aplican al momento, como en la web) ---

  buscar(texto: string | null | undefined): void {
    this.busqueda.set(texto ?? '');
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.cargarProductos(), 300);
  }

  elegirCategoria(categoria: string): void {
    this.categoria.set(this.categoria() === categoria ? '' : categoria);
    this.cargarProductos();
  }

  // --- Panel de filtros ---

  abrirFiltros(): void {
    this.borradorMinimo = this.precioMinimo();
    this.borradorMaximo = this.precioMaximo();
    this.borradorDisponibilidad = this.disponibilidad();
    this.borradorSoloFavoritos = this.soloFavoritos();
    this.errorFiltros.set('');
    this.panelFiltros.set(true);
  }

  aplicarFiltros(): void {
    const min = String(this.borradorMinimo ?? '').trim();
    const max = String(this.borradorMaximo ?? '').trim();
    const invalido = (v: string) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0);
    if (invalido(min)) {
      this.errorFiltros.set('El precio mínimo debe ser un valor válido igual o mayor que cero.');
      return;
    }
    if (invalido(max)) {
      this.errorFiltros.set('El precio máximo debe ser un valor válido igual o mayor que cero.');
      return;
    }
    if (min !== '' && max !== '' && Number(min) > Number(max)) {
      this.errorFiltros.set('El precio mínimo no puede superar el precio máximo.');
      return;
    }
    this.precioMinimo.set(min);
    this.precioMaximo.set(max);
    this.disponibilidad.set(this.borradorDisponibilidad);
    this.soloFavoritos.set(this.borradorSoloFavoritos);
    this.panelFiltros.set(false);
    this.cargarProductos();
  }

  limpiarFiltros(): void {
    clearTimeout(this.temporizadorBusqueda);
    this.busqueda.set('');
    this.categoria.set('');
    this.precioMinimo.set('');
    this.precioMaximo.set('');
    this.disponibilidad.set('todos');
    this.soloFavoritos.set(false);
    this.panelFiltros.set(false);
    this.cargarProductos();
  }

  // --- Favoritos ---

  cargarFavoritos(): void {
    this.favoritosApi.consultar().subscribe({
      next: (r) => {
        this.idsFavoritos.set(new Set(r.ids));
        this.favoritosDisponibles.set(true);
      },
      error: () => this.favoritosDisponibles.set(false)
    });
  }

  alternarFavorito(producto: ProductoCatalogo): void {
    if (!this.favoritosDisponibles() || this.cambiandoFavorito()) return;
    const yaGuardado = this.idsFavoritos().has(producto.id);
    this.cambiandoFavorito.set(producto.id);
    (yaGuardado ? this.favoritosApi.quitar(producto.id) : this.favoritosApi.anadir(producto.id)).subscribe({
      next: (r) => {
        this.idsFavoritos.set(new Set(r.ids));
        this.cambiandoFavorito.set(null);
        this.aviso(yaGuardado ? 'Producto eliminado de favoritos.' : 'Producto guardado en favoritos.');
      },
      error: (e: HttpErrorResponse) => {
        this.cambiandoFavorito.set(null);
        this.aviso(
          e.status === 0 ? 'No se pudo conectar con el servicio de favoritos.' : 'No se pudo actualizar tus favoritos.',
          true
        );
      }
    });
  }

  // --- Categorías favoritas (como en la web) ---

  cargarCategoriasFavoritas(): void {
    this.categoriasFavoritasDisponibles.set(false);
    this.errorCategoriasFavoritas.set('');
    this.categoriasFavoritasApi.consultarCategorias().subscribe({
      next: (categorias) => this.catalogoCategorias.set(categorias),
      // Sin catálogo solo se pueden gestionar las categorías que ya son favoritas.
      error: () => this.catalogoCategorias.set([])
    });
    this.categoriasFavoritasApi.consultar().subscribe({
      next: (categorias) => {
        this.categoriasFavoritas.set(categorias);
        this.categoriasFavoritasDisponibles.set(true);
      },
      error: (e: HttpErrorResponse) =>
        this.errorCategoriasFavoritas.set(
          e.status === 0
            ? 'No se pudo conectar con el servicio de categorías favoritas.'
            : 'No se pudieron consultar tus categorías favoritas.'
        )
    });
  }

  esCategoriaFavorita(nombre: string): boolean {
    const clave = claveCategoria(nombre);
    return this.categoriasFavoritas().some((c) => claveCategoria(c.nombre) === clave);
  }

  cambiarCategoriaFavorita(): void {
    const categoriaId = this.idCategoriaSeleccionada();
    const nombre = this.categoria();
    if (categoriaId === null || !this.categoriasFavoritasDisponibles() || this.modificandoCategoriaFavorita()) return;
    const yaFavorita = this.categoriaSeleccionadaEsFavorita();
    this.modificandoCategoriaFavorita.set(true);
    (yaFavorita ? this.categoriasFavoritasApi.quitar(categoriaId) : this.categoriasFavoritasApi.anadir(categoriaId))
      .subscribe({
        next: (categorias) => {
          this.categoriasFavoritas.set(categorias);
          this.modificandoCategoriaFavorita.set(false);
          this.aviso(
            yaFavorita
              ? `Categoría «${nombre}» eliminada de tus favoritas.`
              : `Categoría «${nombre}» guardada en tus favoritas.`
          );
        },
        error: (e: HttpErrorResponse) => {
          this.modificandoCategoriaFavorita.set(false);
          this.aviso(mensajeErrorCategoriaFavorita(e), true);
        }
      });
  }

  // --- Carrito ---

  anadirAlCarrito(producto: ProductoCatalogo): void {
    if (this.anadiendo()) return;
    this.anadiendo.set(producto.id);
    this.carritoApi.anadirProducto(producto.id, 1).subscribe({
      next: (carrito) => {
        this.anadiendo.set(null);
        const total = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
          carrito.importe
        );
        this.aviso(`Producto añadido al carrito. Importe del carrito: ${total} €.`);
      },
      error: (e: HttpErrorResponse) => {
        this.anadiendo.set(null);
        this.aviso(mensajeErrorCarrito(e), true);
      }
    });
  }

  abrirProducto(producto: ProductoCatalogo): void {
    this.router.navigate(['/tienda/producto', producto.id]);
  }

  private async aviso(mensaje: string, esError = false): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: esError ? 3500 : 2000,
      position: 'top',
      color: esError ? 'danger' : 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }],
      cssClass: 'aviso-esibuy'
    });
    await toast.present();
  }
}
