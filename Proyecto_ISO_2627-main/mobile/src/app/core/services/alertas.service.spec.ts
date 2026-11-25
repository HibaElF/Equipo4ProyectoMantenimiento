import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { etiquetaTipoAlerta, textoContador } from '../models/alerta';
import { AlertasEstadoService, INTERVALO_CONTADOR_MS } from './alertas-estado.service';
import { AlertasService, mensajeErrorAlertas } from './alertas.service';

const respuesta = (noLeidas: number) => ({ alertas: [], noLeidas });

describe('AlertasEstadoService (contador de la campana)', () => {
  let http: HttpTestingController;
  let estado: AlertasEstadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    estado = TestBed.inject(AlertasEstadoService);
  });

  afterEach(() => http.verify());

  it('consulta el contador y no lo repite antes de 30 s salvo que se fuerce', () => {
    vi.useFakeTimers();
    try {
      estado.refrescar();
      http.expectOne(`${environment.apiUrl}/cliente/alertas`).flush(respuesta(3));
      expect(estado.noLeidas()).toBe(3);

      estado.refrescar();
      http.expectNone(`${environment.apiUrl}/cliente/alertas`);

      vi.advanceTimersByTime(INTERVALO_CONTADOR_MS);
      estado.refrescar();
      http.expectOne(`${environment.apiUrl}/cliente/alertas`).flush(respuesta(1));
      expect(estado.noLeidas()).toBe(1);

      estado.refrescar(true);
      http.expectOne(`${environment.apiUrl}/cliente/alertas`).flush(respuesta(0));
      expect(estado.noLeidas()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('si falla, la campana se queda como estaba', () => {
    estado.actualizar(respuesta(2));
    estado.refrescar(true);
    http.expectOne(`${environment.apiUrl}/cliente/alertas`).flush(null, { status: 500, statusText: 'Error' });
    expect(estado.noLeidas()).toBe(2);
  });

  it('al cerrar sesión se pone a cero', () => {
    estado.actualizar(respuesta(4));
    estado.reiniciar();
    expect(estado.noLeidas()).toBe(0);
  });
});

describe('AlertasService', () => {
  const auth = { peticionConCsrf: vi.fn() };

  beforeEach(() => {
    auth.peticionConCsrf.mockReset().mockReturnValue(of(respuesta(1)));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }]
    });
  });

  it('las mismas rutas que la web, con CSRF, y cada respuesta actualiza el contador', () => {
    const api = TestBed.inject(AlertasService);
    const estado = TestBed.inject(AlertasEstadoService);
    api.marcarLeida('a/1').subscribe();
    api.marcarTodasLeidas().subscribe();
    api.borrar('a1').subscribe();
    api.borrarTodas().subscribe();
    expect(auth.peticionConCsrf.mock.calls).toEqual([
      ['PATCH', '/cliente/alertas/a%2F1/leida'],
      ['PATCH', '/cliente/alertas/leidas'],
      ['DELETE', '/cliente/alertas/a1'],
      ['DELETE', '/cliente/alertas']
    ]);
    expect(estado.noLeidas()).toBe(1);
  });

  it('consultar actualiza también el contador', () => {
    const api = TestBed.inject(AlertasService);
    api.consultar().subscribe();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/cliente/alertas`).flush(respuesta(5));
    expect(TestBed.inject(AlertasEstadoService).noLeidas()).toBe(5);
  });
});

describe('alertas: textos', () => {
  it('etiquetas de la web y contador con «9+»', () => {
    expect(etiquetaTipoAlerta('BAJADA_PRECIO')).toBe('Bajada de precio');
    expect(etiquetaTipoAlerta('DISPONIBILIDAD')).toBe('Disponible de nuevo');
    expect(etiquetaTipoAlerta('RECOMENDACION')).toBe('Recomendación');
    expect(textoContador(3)).toBe('3');
    expect(textoContador(12)).toBe('9+');
  });

  it('mensajes de error de la web', () => {
    const err = (status: number) => new HttpErrorResponse({ status });
    expect(mensajeErrorAlertas(err(401), 'x')).toBe('Tu sesión ha caducado.');
    expect(mensajeErrorAlertas(err(0), 'x')).toBe('No se pudo conectar con el servidor.');
    expect(mensajeErrorAlertas(err(404), 'x')).toBe('La alerta ya no existe. Recarga la lista.');
    expect(mensajeErrorAlertas(err(500), 'Por defecto')).toBe('Por defecto');
  });
});
