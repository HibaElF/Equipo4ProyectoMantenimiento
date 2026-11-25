import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ProductoCatalogo } from '../../core/models/producto';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ListasService } from '../../core/services/listas.service';
import { ProductoService } from '../../core/services/producto.service';
import { ProductoPage } from './producto.page';

const producto: ProductoCatalogo = {
  id: 'p1',
  nombre: 'Auriculares',
  categoria: 'Electrónica',
  stock: 3,
  precio: 60,
  precioOriginal: 80,
  descuento: 25,
  descuentoPremium: 0,
  descuentoAplicado: 25,
  descripcion: null,
  imagen: null,
  vendedor: 'SonidoPro',
  esVisible: true,
  soloPremium: false
};

describe('ProductoPage', () => {
  const consultarDetalle = vi.fn();
  const anadirProducto = vi.fn();
  const anadirALista = vi.fn();

  beforeEach(() => {
    consultarDetalle.mockReset().mockReturnValue(of(producto));
    anadirProducto.mockReset().mockReturnValue(of({ productos: [], importe: 120 }));
    anadirALista.mockReset().mockReturnValue(
      of({ id: 'l1', nombre: 'Regalos', predeterminada: false, productos: [{ id: 'p1' }] })
    );
    TestBed.configureTestingModule({
      imports: [ProductoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } },
        {
          provide: ProductoService,
          useValue: {
            consultarDetalle,
            consultarValoraciones: () => of({ media: 0, total: 0, valoraciones: [] }),
            urlImagen: (i: string) => i
          }
        },
        { provide: FavoritosService, useValue: { consultar: () => of({ ids: [], productos: [] }) } },
        {
          provide: ListasService,
          useValue: {
            consultarListas: () =>
              of([
                { id: 'l0', nombre: 'Favoritos', predeterminada: true, productoIds: [] },
                { id: 'l1', nombre: 'Regalos', predeterminada: false, productoIds: [] }
              ]),
            anadirProducto: anadirALista
          }
        },
        { provide: CarritoService, useValue: { anadirProducto } }
      ]
    });
  });

  it('la cantidad no baja de 1 ni supera el stock', () => {
    const pagina = TestBed.createComponent(ProductoPage).componentInstance;
    pagina.reducir();
    expect(pagina.cantidad()).toBe(1);
    pagina.aumentar();
    pagina.aumentar();
    pagina.aumentar();
    expect(pagina.cantidad()).toBe(3);
  });

  it('añade al carrito la cantidad elegida', () => {
    const pagina = TestBed.createComponent(ProductoPage).componentInstance;
    pagina.aumentar();
    pagina.anadirAlCarrito();
    expect(anadirProducto).toHaveBeenCalledWith('p1', 2);
  });

  it('solo ofrece las listas creadas por el cliente y añade el producto', () => {
    const pagina = TestBed.createComponent(ProductoPage).componentInstance;
    expect(pagina.listasPersonales().map((l) => l.nombre)).toEqual(['Regalos']);
    pagina.alternarEnLista(pagina.listasPersonales()[0]);
    expect(anadirALista).toHaveBeenCalledWith('l1', 'p1');
    expect(pagina.listasConProducto()).toBe(1);
  });

  it('avisa si el producto es solo para clientes Premium', () => {
    consultarDetalle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const pagina = TestBed.createComponent(ProductoPage).componentInstance;
    expect(pagina.error()).toBe('Este producto es solo para clientes Premium.');
  });
});
