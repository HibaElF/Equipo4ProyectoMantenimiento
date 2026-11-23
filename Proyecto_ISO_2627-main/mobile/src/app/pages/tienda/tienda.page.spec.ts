import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ProductoCatalogo } from '../../core/models/producto';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ProductoService } from '../../core/services/producto.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { TiendaPage } from './tienda.page';

describe('TiendaPage', () => {
  const consultarCatalogo = vi.fn();

  beforeEach(() => {
    consultarCatalogo.mockReset().mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [TiendaPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ProductoService, useValue: { consultarCatalogo, urlImagen: (i: string) => i } },
        { provide: FavoritosService, useValue: { consultar: () => of({ ids: [], productos: [] }) } },
        { provide: CarritoService, useValue: {} }
      ]
    });
  });

  it('carga el catálogo sin filtros al entrar', () => {
    TestBed.createComponent(TiendaPage);
    expect(consultarCatalogo).toHaveBeenCalledWith({
      nombre: undefined,
      categoria: undefined,
      precioMinimo: undefined,
      precioMaximo: undefined,
      disponible: undefined
    });
  });

  it('rechaza un precio mínimo mayor que el máximo', () => {
    const pagina = TestBed.createComponent(TiendaPage).componentInstance;
    pagina.borradorMinimo = '50';
    pagina.borradorMaximo = '10';
    pagina.aplicarFiltros();
    expect(pagina.errorFiltros()).toBe('El precio mínimo no puede superar el precio máximo.');
  });

  it('aplica los filtros del panel y los envía al backend', () => {
    const pagina = TestBed.createComponent(TiendaPage).componentInstance;
    pagina.borradorMinimo = '5';
    pagina.borradorDisponibilidad = 'disponibles';
    pagina.aplicarFiltros();
    expect(consultarCatalogo).toHaveBeenLastCalledWith(
      expect.objectContaining({ precioMinimo: 5, disponible: true })
    );
    expect(pagina.numeroFiltrosPanel()).toBe(2);
  });

  it('la categoría elegida se puede desmarcar', () => {
    const pagina = TestBed.createComponent(TiendaPage).componentInstance;
    pagina.elegirCategoria('Hogar');
    expect(pagina.categoria()).toBe('Hogar');
    pagina.elegirCategoria('Hogar');
    expect(pagina.categoria()).toBe('');
  });
});

describe('TiendaPage: búsqueda, favoritos y carrito', () => {
  const productos = { consultarCatalogo: vi.fn(), urlImagen: (i: string) => i };
  const favoritos = { consultar: vi.fn(), anadir: vi.fn(), quitar: vi.fn() };
  const carrito = { anadirProducto: vi.fn() };
  const p = { id: 'p1', nombre: 'Mochila', categoria: 'Viaje' } as ProductoCatalogo;

  function crear() {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [TiendaPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ProductoService, useValue: productos },
        { provide: FavoritosService, useValue: favoritos },
        { provide: CarritoService, useValue: carrito },
        ...falsos.providers
      ]
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const pagina = TestBed.createComponent(TiendaPage).componentInstance;
    pagina.ionViewWillEnter();
    return { pagina, navegar, ...falsos };
  }

  beforeEach(() => {
    [productos, favoritos, carrito].forEach((o) => Object.values(o).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()));
    productos.consultarCatalogo.mockReturnValue(of([p]));
    favoritos.consultar.mockReturnValue(of({ ids: [], productos: [] }));
  });

  it('la búsqueda espera a que se deje de escribir (300 ms)', () => {
    vi.useFakeTimers();
    try {
      const { pagina } = crear();
      productos.consultarCatalogo.mockClear();
      pagina.buscar('mo');
      pagina.buscar('moch');
      expect(productos.consultarCatalogo).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(productos.consultarCatalogo).toHaveBeenCalledTimes(1);
      expect(productos.consultarCatalogo.mock.calls[0][0]).toMatchObject({ nombre: 'moch' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('limpiar filtros vuelve a cargar sin filtros', () => {
    const { pagina } = crear();
    pagina.buscar('x');
    pagina.elegirCategoria('Viaje');
    pagina.limpiarFiltros();
    expect(productos.consultarCatalogo.mock.lastCall?.[0]).toEqual({
      nombre: undefined, categoria: undefined, precioMinimo: undefined, precioMaximo: undefined, disponible: undefined
    });
  });

  it('precios negativos no son válidos', () => {
    const { pagina } = crear();
    pagina.abrirFiltros();
    pagina.borradorMinimo = '-5';
    pagina.aplicarFiltros();
    expect(pagina.errorFiltros()).toBe('El precio mínimo debe ser un valor válido igual o mayor que cero.');
    pagina.borradorMinimo = '';
    pagina.borradorMaximo = 'abc';
    pagina.aplicarFiltros();
    expect(pagina.errorFiltros()).toBe('El precio máximo debe ser un valor válido igual o mayor que cero.');
  });

  it('guarda y quita favoritos con su aviso', async () => {
    favoritos.anadir.mockReturnValue(of({ ids: ['p1'], productos: [] }));
    favoritos.quitar.mockReturnValue(of({ ids: [], productos: [] }));
    const { pagina, toasts } = crear();
    pagina.alternarFavorito(p);
    expect(favoritos.anadir).toHaveBeenCalledWith('p1');
    pagina.alternarFavorito(p);
    expect(favoritos.quitar).toHaveBeenCalledWith('p1');
    await Promise.resolve();
    expect(toasts.mensajes).toEqual(['Producto guardado en favoritos.', 'Producto eliminado de favoritos.']);
  });

  it('si los favoritos no cargan, el corazón queda desactivado', () => {
    favoritos.consultar.mockReturnValue(throwError(() => new Error('x')));
    const { pagina } = crear();
    pagina.alternarFavorito(p);
    expect(favoritos.anadir).not.toHaveBeenCalled();
  });

  it('añadir al carrito avisa con el importe en formato español', async () => {
    carrito.anadirProducto.mockReturnValue(of({ productos: [], importe: 1234.5 }));
    const { pagina, toasts } = crear();
    pagina.anadirAlCarrito(p);
    expect(carrito.anadirProducto).toHaveBeenCalledWith('p1', 1);
    await Promise.resolve();
    expect(toasts.mensajes[0]).toMatch(/^Producto añadido al carrito\. Importe del carrito: 1\.?234,50 €\.$/);
  });

  it('error al añadir al carrito', async () => {
    carrito.anadirProducto.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const { pagina, toasts } = crear();
    pagina.anadirAlCarrito(p);
    await Promise.resolve();
    expect(toasts.mensajes[0]).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
  });

  it('error al cargar el catálogo', () => {
    productos.consultarCatalogo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(crear().pagina.error()).toBe('No se pudo cargar el catálogo. Inténtalo de nuevo.');
  });

  it('abre el detalle del producto', () => {
    const { pagina, navegar } = crear();
    pagina.abrirProducto(p);
    expect(navegar).toHaveBeenCalledWith(['/tienda/producto', 'p1']);
  });
});
