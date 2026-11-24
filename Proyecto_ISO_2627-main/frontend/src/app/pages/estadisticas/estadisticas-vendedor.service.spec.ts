import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import {
  EstadisticasValoraciones,
  EstadisticasVendedorService,
  EstadisticasVentas
} from './estadisticas-vendedor.service';

describe('EstadisticasVendedorService', () => {
  let servicio: EstadisticasVendedorService;
  let http: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/vendedor/estadisticas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    servicio = TestBed.inject(EstadisticasVendedorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('PBI 276: consulta las ventas con la sesión del vendedor', () => {
    const ventas: EstadisticasVentas = {
      masVendidos: [{ productoId: 'p1', nombre: 'Auriculares', vendedor: 'Mi Tienda', unidadesVendidas: 15 }],
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

  it('PBI 277: consulta las valoraciones con la sesión del vendedor', () => {
    const valoraciones: EstadisticasValoraciones = {
      mejorValorados: [{ productoId: 'p1', nombre: 'Monitor', vendedor: 'Mi Tienda', valoracionMedia: 5, numeroValoraciones: 1 }],
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
