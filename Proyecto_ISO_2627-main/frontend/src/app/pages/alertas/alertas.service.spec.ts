import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { AlertasService } from './alertas.service';

describe('AlertasService', () => {
  const url = `${environment.apiUrl}/cliente/alertas`;
  let servicio: AlertasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(AlertasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('consulta las alertas con credenciales y actualiza las no leídas', () => {
    servicio.consultar().subscribe();

    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush({ alertas: [], noLeidas: 3 });

    expect(servicio.noLeidas()).toBe(3);
  });

  it.each([
    ['marcarLeida', 'PATCH', '/a%2F1/leida'],
    ['marcarTodasLeidas', 'PATCH', '/leidas']
  ])('envía %s con token CSRF y sesión', (accion, metodo, ruta) => {
    const operaciones: Record<string, () => Observable<unknown>> = {
      marcarLeida: () => servicio.marcarLeida('a/1'),
      marcarTodasLeidas: () => servicio.marcarTodasLeidas()
    };

    operaciones[accion]().subscribe();

    http.expectOne(`${environment.apiUrl}/usuarios/csrf`).flush({ token: 'token-alertas' });
    const mutacion = http.expectOne(`${url}${ruta}`);
    expect(mutacion.request.method).toBe(metodo);
    expect(mutacion.request.withCredentials).toBe(true);
    expect(mutacion.request.headers.get('X-XSRF-TOKEN')).toBe('token-alertas');
    mutacion.flush({ alertas: [], noLeidas: 0 });

    expect(servicio.noLeidas()).toBe(0);
  });
});
