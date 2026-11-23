import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VerificarCorreoService } from './verificar-correo.service';
import { environment } from '../../../environments/environment';

describe('VerificarCorreoService', () => {
  let servicio: VerificarCorreoService;
  let http: HttpTestingController;
  const csrf = `${environment.apiUrl}/usuarios/csrf`;
  const url = `${environment.apiUrl}/usuarios/verificar-correo`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(VerificarCorreoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('pide el token CSRF y envía el token del enlace en el cuerpo', () => {
    let terminado = false;
    servicio.verificar('token-del-correo').subscribe(() => (terminado = true));

    http.expectNone(url);
    const token = http.expectOne(csrf);
    expect(token.request.withCredentials).toBe(true);
    token.flush({ token: 'csrf-prueba' });

    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-prueba');
    expect(peticion.request.body).toEqual({ token: 'token-del-correo' });
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    expect(terminado).toBe(true);
  });

  it('no envía el token del enlace si falla el CSRF', () => {
    let status = 0;
    servicio.verificar('token').subscribe({ error: (e) => (status = e.status) });

    http.expectOne(csrf).flush({}, { status: 403, statusText: 'Forbidden' });

    http.expectNone(url);
    expect(status).toBe(403);
  });
});
