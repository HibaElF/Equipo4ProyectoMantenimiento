import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ListaProductos } from '../../core/models/listas';
import { ListasService, mensajeErrorListas } from '../../core/services/listas.service';
import { ListaPage } from './lista.page';

const producto = { id: 'p1', nombre: 'A', imagen: null, precio: 1, stock: 1, disponible: true, aviso: null };
const lista = (predeterminada = false): ListaProductos => ({ id: 'l1', nombre: 'Regalos', predeterminada, productos: [producto] });

describe('ListaPage', () => {
  const api = { consultarLista: vi.fn(), renombrarLista: vi.fn(), eliminarLista: vi.fn(), quitarProducto: vi.fn() };

  function crear(l: ListaProductos) {
    api.consultarLista.mockReturnValue(of(l));
    TestBed.configureTestingModule({
      imports: [ListaPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ListasService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: l.id }) } } }
      ]
    });
    const pagina = TestBed.createComponent(ListaPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('la lista de favoritos no se puede renombrar', () => {
    const pagina = crear(lista(true));
    pagina.iniciarRenombrar();
    expect(pagina.renombrando()).toBe(false);
  });

  it('renombra con el nombre recortado', () => {
    api.renombrarLista.mockReturnValue(of({ ...lista(), nombre: 'Navidad' }));
    const pagina = crear(lista());
    pagina.iniciarRenombrar();
    expect(pagina.nombreRenombrar.value).toBe('Regalos');
    pagina.nombreRenombrar.setValue(' Navidad ');
    pagina.renombrar();
    expect(api.renombrarLista).toHaveBeenCalledWith('l1', 'Navidad');
    expect(pagina.lista()?.nombre).toBe('Navidad');
    expect(pagina.renombrando()).toBe(false);
  });

  it('no renombra con el nombre vacío', () => {
    const pagina = crear(lista());
    pagina.iniciarRenombrar();
    pagina.nombreRenombrar.setValue('  ');
    pagina.renombrar();
    expect(api.renombrarLista).not.toHaveBeenCalled();
  });

  it('quita un producto de la lista', () => {
    api.quitarProducto.mockReturnValue(of({ ...lista(), productos: [] }));
    const pagina = crear(lista());
    pagina.quitarProducto(producto);
    expect(api.quitarProducto).toHaveBeenCalledWith('l1', 'p1');
    expect(pagina.lista()?.productos.length).toBe(0);
  });

  it('muestra el error si la lista no existe', () => {
    api.consultarLista.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { error: 'La lista no existe.' } })));
    TestBed.configureTestingModule({
      imports: [ListaPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ListasService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'x' }) } } }
      ]
    });
    const pagina = TestBed.createComponent(ListaPage).componentInstance;
    pagina.ionViewWillEnter();
    expect(pagina.error()).toBe('La lista no existe.');
  });

  it('solo muestra mensajes funcionales del backend', () => {
    expect(mensajeErrorListas(new HttpErrorResponse({ status: 409, error: { error: 'Ya tienes una lista con ese nombre.' } }), 'x')).toBe(
      'Ya tienes una lista con ese nombre.'
    );
    expect(mensajeErrorListas(new HttpErrorResponse({ status: 500, error: { error: 'NullPointer' } }), 'Por defecto')).toBe('Por defecto');
  });
});
