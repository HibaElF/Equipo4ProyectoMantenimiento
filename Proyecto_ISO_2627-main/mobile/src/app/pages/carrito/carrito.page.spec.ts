import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Carrito, LineaCarrito } from '../../core/models/carrito';
import { CarritoService } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { CarritoPage } from './carrito.page';

const linea = (extra: Partial<LineaCarrito> = {}): LineaCarrito => ({
  productoId: 'p1',
  cantidad: 2,
  precioUnitario: 10,
  subtotal: 20,
  nombre: 'Mochila',
  imagen: null,
  stock: 3,
  disponible: true,
  aviso: null,
  ...extra
});

describe('CarritoPage', () => {
  const modificarCantidad = vi.fn();

  function crear(carrito: Carrito) {
    TestBed.configureTestingModule({
      imports: [CarritoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: CarritoService, useValue: { consultar: () => of(carrito), modificarCantidad } },
        { provide: ProductoService, useValue: { urlImagen: (i: string) => i } }
      ]
    });
    const pagina = TestBed.createComponent(CarritoPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => modificarCantidad.mockReset().mockReturnValue(of({ productos: [], importe: 0 })));

  it('no deja superar el stock al aumentar la cantidad', () => {
    const pagina = crear({ productos: [linea({ cantidad: 3 })], importe: 30 });
    pagina.ajustarCantidad(pagina.carrito()!.productos[0], 1);
    expect(modificarCantidad).not.toHaveBeenCalled();
  });

  it('envía la nueva cantidad al backend', () => {
    const pagina = crear({ productos: [linea()], importe: 20 });
    pagina.ajustarCantidad(pagina.carrito()!.productos[0], 1);
    expect(modificarCantidad).toHaveBeenCalledWith('p1', 3);
  });

  it('bloquea la compra si hay productos no disponibles', () => {
    const pagina = crear({
      productos: [linea({ disponible: false, aviso: 'No hay stock suficiente para la cantidad solicitada.' })],
      importe: 0
    });
    expect(pagina.hayAvisos()).toBe(true);
  });

  it('permite ajustar la cantidad si el aviso es solo de stock insuficiente', () => {
    const pagina = crear({ productos: [], importe: 0 });
    expect(pagina.puedeModificar(linea({ disponible: false, aviso: 'No hay stock suficiente para la cantidad solicitada.' }))).toBe(true);
    expect(pagina.puedeModificar(linea({ disponible: false, aviso: 'El producto ya no está disponible.' }))).toBe(false);
  });
});

describe('CarritoPage: eliminar, descartar, comprar y errores', () => {
  const api = { consultar: vi.fn(), modificarCantidad: vi.fn(), eliminarProducto: vi.fn(), vaciar: vi.fn() };

  function crear(carrito: Carrito) {
    const falsos = controladoresFalsos();
    api.consultar.mockReturnValue(of(carrito));
    TestBed.configureTestingModule({
      imports: [CarritoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: CarritoService, useValue: api },
        { provide: ProductoService, useValue: { urlImagen: (i: string) => `/img/${i}` } },
        ...falsos.providers
      ]
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const pagina = TestBed.createComponent(CarritoPage).componentInstance;
    pagina.ionViewWillEnter();
    return { pagina, navegar, ...falsos };
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('elimina un producto y avisa', async () => {
    api.eliminarProducto.mockReturnValue(of({ productos: [], importe: 0 }));
    const { pagina, toasts } = crear({ productos: [linea()], importe: 20 });
    pagina.eliminar(linea());
    expect(api.eliminarProducto).toHaveBeenCalledWith('p1');
    expect(pagina.carrito()?.productos.length).toBe(0);
    await Promise.resolve();
    expect(toasts.mensajes).toContain('Producto eliminado del carrito.');
  });

  it('descartar el carrito pide confirmación', async () => {
    api.vaciar.mockReturnValue(of({ productos: [], importe: 0 }));
    const { pagina, alertas } = crear({ productos: [linea()], importe: 20 });
    await pagina.confirmarDescarte();
    expect(api.vaciar).not.toHaveBeenCalled();
    alertas.pulsar('Descartar carrito');
    expect(api.vaciar).toHaveBeenCalled();
  });

  it('un carrito vacío no se puede descartar ni comprar', async () => {
    const { pagina, alertas, navegar } = crear({ productos: [], importe: 0 });
    await pagina.confirmarDescarte();
    expect(alertas.creadas.length).toBe(0);
    pagina.comprar();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('comprar lleva al checkout', () => {
    const { pagina, navegar } = crear({ productos: [linea()], importe: 20 });
    pagina.comprar();
    expect(navegar).toHaveBeenCalledWith(['/carrito/checkout']);
  });

  it('tras un error recarga el carrito para mostrar su estado real', async () => {
    api.eliminarProducto.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { pagina, toasts } = crear({ productos: [linea()], importe: 20 });
    pagina.eliminar(linea());
    expect(api.consultar).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(toasts.mensajes).toContain('El producto ya no está en el carrito o ha sido eliminado.');
  });

  it('error al cargar', () => {
    api.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    TestBed.configureTestingModule({
      imports: [CarritoPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: CarritoService, useValue: api }, { provide: ProductoService, useValue: {} }]
    });
    const pagina = TestBed.createComponent(CarritoPage).componentInstance;
    pagina.ionViewWillEnter();
    expect(pagina.error()).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
  });

  it('imagen: URL del producto o ninguna si no carga', () => {
    const { pagina } = crear({ productos: [linea({ imagen: 'a.jpg' })], importe: 20 });
    expect(pagina.urlImagen(linea({ imagen: 'a.jpg' }))).toBe('/img/a.jpg');
    pagina.marcarImagenFallida('p1');
    expect(pagina.urlImagen(linea({ imagen: 'a.jpg' }))).toBeNull();
  });
});
