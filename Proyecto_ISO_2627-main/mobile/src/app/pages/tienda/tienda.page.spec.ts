import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of } from 'rxjs';
import { CarritoService } from '../../core/services/carrito.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ProductoService } from '../../core/services/producto.service';
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
