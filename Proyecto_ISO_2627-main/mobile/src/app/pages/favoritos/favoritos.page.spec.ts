import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ProductoFavorito } from '../../core/models/favoritos';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { FavoritosPage, mensajeErrorFavoritos } from './favoritos.page';

const prod = (id: string, disponible = true): ProductoFavorito => ({
  id, nombre: id, imagen: null, precio: 10, stock: disponible ? 5 : 0, disponible, aviso: disponible ? null : 'Producto agotado'
});

describe('FavoritosPage', () => {
  const favoritos = { consultar: vi.fn(), quitar: vi.fn() };
  const carrito = { anadirProducto: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [FavoritosPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: FavoritosService, useValue: favoritos },
        { provide: CarritoService, useValue: carrito }
      ]
    });
    const pagina = TestBed.createComponent(FavoritosPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => {
    [favoritos, carrito].forEach((o) => Object.values(o).forEach((f) => f.mockReset()));
    favoritos.consultar.mockReturnValue(of({ ids: ['a', 'b'], productos: [prod('a'), prod('b', false)] }));
  });

  it('carga los favoritos', () => {
    const pagina = crear();
    expect(pagina.productos().length).toBe(2);
  });

  it('al quitar un favorito actualiza los productos', () => {
    favoritos.quitar.mockReturnValue(of({ ids: ['b'], productos: [prod('b', false)] }));
    const pagina = crear();
    pagina.quitarFavorito(prod('a'));
    expect(pagina.productos().map((p) => p.id)).toEqual(['b']);
  });

  it('no añade al carrito un producto no disponible', () => {
    const pagina = crear();
    pagina.anadirAlCarrito(prod('b', false));
    expect(carrito.anadirProducto).not.toHaveBeenCalled();
    carrito.anadirProducto.mockReturnValue(of({}));
    pagina.anadirAlCarrito(prod('a'));
    expect(carrito.anadirProducto).toHaveBeenCalledWith('a', 1);
  });

  it('muestra el error si no se pueden cargar', () => {
    favoritos.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const pagina = crear();
    expect(pagina.errorFavoritos()).toBe('No se pudo conectar con el servidor.');
  });

  it('mensajes de error como en la web', () => {
    expect(mensajeErrorFavoritos(new HttpErrorResponse({ status: 409 }), 'x')).toBe(
      'Los favoritos se han modificado. Recarga la lista e inténtalo de nuevo.'
    );
    expect(mensajeErrorFavoritos(new HttpErrorResponse({ status: 500 }), 'Por defecto')).toBe('Por defecto');
  });
});
