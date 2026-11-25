import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PerfilService } from './perfil.service';
import { environment } from '../../../environments/environment';

// T-25: la descarga de los datos personales es un GET con credenciales que devuelve un blob.
describe('Descarga de mis datos (T-25)', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/usuarios/mis-datos`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('pide el JSON con GET, credenciales y respuesta de tipo blob', () => {
    let recibido: Blob | null = null;
    servicio.descargarMisDatos().subscribe(contenido => recibido = contenido);

    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['{}'], { type: 'application/json' }));

    expect(recibido).toBeInstanceOf(Blob);
  });

  it('propaga el error 429 del límite de frecuencia', () => {
    let status = 0;
    servicio.descargarMisDatos().subscribe({ error: error => status = error.status });

    http.expectOne(url).flush(new Blob(['{}']), { status: 429, statusText: 'Too Many Requests' });

    expect(status).toBe(429);
  });
});
