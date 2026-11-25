import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { CategoriasFavoritasService, mensajeErrorCategoriaFavorita } from './categorias-favoritas.service';

describe('CategoriasFavoritasService', () => {
  const api = environment.apiUrl;
  let servicio: CategoriasFavoritasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CategoriasFavoritasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta las favoritas con la cookie de sesión', () => {
    servicio.consultar().subscribe((r) => expect(r).toEqual([{ id: 'c1', nombre: 'Hogar' }]));
    const peticion = http.expectOne(`${api}/cliente/categorias-favoritas`);
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush([{ id: 'c1', nombre: 'Hogar' }]);
  });

  it('consulta el catálogo de categorías', () => {
    servicio.consultarCategorias().subscribe();
    http.expectOne(`${api}/categorias/registro`).flush([]);
  });

  it('añade y quita una favorita con su token CSRF', () => {
    servicio.anadir('c 1').subscribe();
    http.expectOne(`${api}/usuarios/csrf`).flush({ token: 't' });
    const put = http.expectOne(`${api}/cliente/categorias-favoritas/c%201`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.headers.get('X-XSRF-TOKEN')).toBe('t');
    put.flush([]);

    servicio.quitar('c1').subscribe();
    http.expectOne(`${api}/usuarios/csrf`).flush({ token: 't' });
    const del = http.expectOne(`${api}/cliente/categorias-favoritas/c1`);
    expect(del.request.method).toBe('DELETE');
    del.flush([]);
  });

  it('traduce los errores igual que la web', () => {
    const error = (status: number) => new HttpErrorResponse({ status });
    expect(mensajeErrorCategoriaFavorita(error(0))).toBe('No se pudo conectar con el servidor.');
    expect(mensajeErrorCategoriaFavorita(error(404))).toBe('La categoría ya no existe.');
    expect(mensajeErrorCategoriaFavorita(error(500))).toBe('No se pudo actualizar la categoría favorita.');
  });
});
