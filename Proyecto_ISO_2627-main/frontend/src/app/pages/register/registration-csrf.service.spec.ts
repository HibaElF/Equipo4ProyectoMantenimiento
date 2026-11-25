import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistrationService } from './registration.service';
import { environment } from '../../../environments/environment';

describe('Alta pública con CSRF (T-10)', () => {
  let servicio: RegistrationService;
  let http: HttpTestingController;
  const csrf = `${environment.apiUrl}/usuarios/csrf`;
  const cliente = {
    nombre: 'Ada', apellidos: 'Lovelace', fechaNacimiento: '1990-12-10', dniNif: '12345678Z',
    email: 'ada@example.com', contrasena: 'ClaveSegura9!', esPremium: false,
  };
  const vendedor = {
    nombre: 'Luis', apellidos: 'Martín', dniNif: '12345678Z', email: 'luis@example.com',
    contrasena: 'ClaveSegura9!', categoriaId: 'cat-1', nombreComercial: 'UrbanStyle',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(RegistrationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it.each([
    ['cliente', '/cliente/register'],
    ['vendedor', '/vendedor/register'],
  ])('pide el token CSRF antes de enviar el alta de %s', (tipo, ruta) => {
    const respuesta = { mensaje: 'ok' };
    let recibida: unknown;
    const solicitud = tipo === 'cliente' ? cliente : vendedor;
    (tipo === 'cliente'
      ? servicio.registerCliente(solicitud as never)
      : servicio.registerVendedor(solicitud as never)
    ).subscribe((r) => (recibida = r));

    http.expectNone(`${environment.apiUrl}${ruta}`);
    const token = http.expectOne(csrf);
    expect(token.request.method).toBe('GET');
    expect(token.request.withCredentials).toBe(true);
    token.flush({ token: 'csrf-prueba' });

    const peticion = http.expectOne(`${environment.apiUrl}${ruta}`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-prueba');
    expect(peticion.request.body).toEqual(solicitud);
    peticion.flush(respuesta, { status: 202, statusText: 'Accepted' });
    expect(recibida).toEqual(respuesta);
  });

  it('no envía el alta si falla la obtención del token CSRF', () => {
    let status = 0;
    servicio.registerCliente(cliente as never).subscribe({ error: (e) => (status = e.status) });

    http.expectOne(csrf).flush({}, { status: 403, statusText: 'Forbidden' });

    http.expectNone(`${environment.apiUrl}/cliente/register`);
    expect(status).toBe(403);
  });

  it('propaga el 429 del límite de altas sin reintentar', () => {
    let error: { status: number; headers: { get(n: string): string | null } } | undefined;
    servicio.registerCliente(cliente as never).subscribe({ error: (e) => (error = e) });

    http.expectOne(csrf).flush({ token: 'csrf-prueba' });
    http.expectOne(`${environment.apiUrl}/cliente/register`).flush(
      { error: 'Demasiados intentos de registro desde esta conexión. Inténtalo de nuevo en 120 segundos.' },
      { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '120' } }
    );

    expect(error?.status).toBe(429);
    expect(error?.headers.get('Retry-After')).toBe('120');
  });
});
