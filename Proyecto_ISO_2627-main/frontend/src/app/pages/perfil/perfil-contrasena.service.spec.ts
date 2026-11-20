import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PerfilService } from './perfil.service';
import { environment } from '../../../environments/environment';

describe('Cambio de contraseña del perfil', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;
  const csrf = `${environment.apiUrl}/usuarios/csrf`;
  const url = `${environment.apiUrl}/usuarios/contrasena`;
  const datos = { contrasenaActual: 'ClaveActual9!x', nuevaContrasena: 'NuevaClaveSegura7#' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('envía el cambio con PUT, credenciales y el token CSRF obtenido antes', () => {
    servicio.cambiarContrasena(datos).subscribe();
    http.expectNone(url);
    const token = http.expectOne(csrf);
    expect(token.request.withCredentials).toBe(true);
    token.flush({ token: 'csrf-prueba' });

    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-prueba');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('no cambia la contraseña si falla la obtención del CSRF', () => {
    let status = 0;
    servicio.cambiarContrasena(datos).subscribe({ error: error => status = error.status });
    http.expectOne(csrf).flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(url);
    expect(status).toBe(403);
  });
});
