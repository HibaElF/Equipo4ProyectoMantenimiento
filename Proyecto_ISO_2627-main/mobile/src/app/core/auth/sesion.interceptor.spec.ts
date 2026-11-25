import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { sesionInterceptor } from './sesion.interceptor';

describe('sesionInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const navegar = vi.fn();

  beforeEach(() => {
    navegar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/tienda', navigate: navegar } }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('vuelve al login si una petición responde 401', () => {
    http.get('/carrito').subscribe({ error: () => undefined });
    backend.expectOne('/carrito').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).toHaveBeenCalledWith(['/login'], {
      queryParams: { motivo: 'sesion-expirada' },
      replaceUrl: true
    });
  });

  it('no redirige cuando falla el propio login', () => {
    http.post('/usuarios/login', {}).subscribe({ error: () => undefined });
    backend.expectOne('/usuarios/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).not.toHaveBeenCalled();
  });

  it('no redirige con otros errores', () => {
    http.get('/productos').subscribe({ error: () => undefined });
    backend.expectOne('/productos').flush(null, { status: 500, statusText: 'Error' });
    expect(navegar).not.toHaveBeenCalled();
  });
});
