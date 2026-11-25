import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ListasService } from '../../core/services/listas.service';
import { ListasPage } from './listas.page';

describe('ListasPage', () => {
  const api = { consultarListas: vi.fn(), crearLista: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [ListasPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: ListasService, useValue: api }]
    });
    const pagina = TestBed.createComponent(ListasPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.consultarListas.mockReturnValue(
      of([
        { id: 'l1', nombre: 'Regalos', predeterminada: false, productoIds: [] },
        { id: 'l0', nombre: 'Favoritos', predeterminada: true, productoIds: ['a', 'b'] }
      ])
    );
  });

  it('pone la lista de favoritos la primera', () => {
    expect(crear().listas().map((l) => l.id)).toEqual(['l0', 'l1']);
  });

  it('Favoritos abre su pantalla y las demás listas su detalle', () => {
    const pagina = crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    pagina.abrirLista(pagina.listas()[0]);
    expect(navegar).toHaveBeenLastCalledWith(['/listas/favoritos']);
    pagina.abrirLista(pagina.listas()[1]);
    expect(navegar).toHaveBeenLastCalledWith(['/listas', 'l1']);
  });

  it('no crea una lista con el nombre vacío y recorta el nombre', () => {
    const pagina = crear();
    pagina.nombreNueva.setValue('   ');
    pagina.crearLista();
    expect(api.crearLista).not.toHaveBeenCalled();
    api.crearLista.mockReturnValue(of({ id: 'l2', nombre: 'Casa', predeterminada: false, productos: [] }));
    pagina.nombreNueva.setValue('  Casa ');
    pagina.crearLista();
    expect(api.crearLista).toHaveBeenCalledWith('Casa');
    expect(pagina.listas().map((l) => l.nombre)).toContain('Casa');
  });

  it('no deja nombres de más de 50 caracteres', () => {
    const pagina = crear();
    pagina.nombreNueva.setValue('x'.repeat(51));
    pagina.crearLista();
    expect(api.crearLista).not.toHaveBeenCalled();
  });

  it('muestra el error si no se pueden cargar', () => {
    api.consultarListas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(crear().error()).toBe('No se pudo conectar con el servidor.');
  });
});
