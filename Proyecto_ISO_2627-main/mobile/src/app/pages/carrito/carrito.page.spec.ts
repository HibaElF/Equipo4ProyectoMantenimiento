import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of } from 'rxjs';
import { Carrito, LineaCarrito } from '../../core/models/carrito';
import { CarritoService } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto.service';
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
