import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { EstadisticasAdminService } from './estadisticas-admin.service';
import type { EstadisticasValoraciones, EstadisticasVentas } from './estadisticas-vendedor.service';

describe('EstadisticasAdminService', () => {
  let servicio: EstadisticasAdminService;
  let http: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/administrador/estadisticas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    servicio = TestBed.inject(EstadisticasAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('PBI 279: consulta las ventas de todas las tiendas con la sesión del administrador', () => {
    const ventas: EstadisticasVentas = {
      masVendidos: [{ productoId: 'p2', nombre: 'Mochila', vendedor: 'Tienda B', unidadesVendidas: 6 }],
      menosVendidos: [],
      aviso: null
    };
    let resultado: EstadisticasVentas | undefined;

    servicio.consultarVentas().subscribe((datos) => resultado = datos);

    const peticion = http.expectOne(`${baseUrl}/ventas`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush(ventas);

    expect(resultado).toEqual(ventas);
  });

  it('PBI 280: consulta las valoraciones de todas las tiendas con la sesión del administrador', () => {
    const valoraciones: EstadisticasValoraciones = {
      mejorValorados: [{ productoId: 'p2', nombre: 'Mochila', vendedor: 'Tienda B', valoracionMedia: 4.75, numeroValoraciones: 4 }],
      peorValorados: [],
      aviso: null
    };
    let resultado: EstadisticasValoraciones | undefined;

    servicio.consultarValoraciones().subscribe((datos) => resultado = datos);

    const peticion = http.expectOne(`${baseUrl}/valoraciones`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush(valoraciones);

    expect(resultado).toEqual(valoraciones);
  });
});
