import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { EstadisticasVendedor } from './estadisticas-vendedor';
import {
  EstadisticasValoraciones,
  EstadisticasVendedorService,
  EstadisticasVentas,
  ValoracionesCatalogo
} from './estadisticas-vendedor.service';

describe('EstadisticasVendedor', () => {
  let fixture: ComponentFixture<EstadisticasVendedor>;

  const ventas: EstadisticasVentas = {
    masVendidos: [
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Mi Tienda', unidadesVendidas: 15 },
      { productoId: 'p2', nombre: 'Teclado', vendedor: 'Mi Tienda', unidadesVendidas: 12 }
    ],
    menosVendidos: [
      { productoId: 'p3', nombre: 'Funda tablet', vendedor: 'Mi Tienda', unidadesVendidas: 0 }
    ],
    aviso: null
  };

  const valoraciones: EstadisticasValoraciones = {
    mejorValorados: [
      { productoId: 'p4', nombre: 'Monitor', vendedor: 'Mi Tienda', valoracionMedia: 5, numeroValoraciones: 1 },
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Mi Tienda', valoracionMedia: 4.67, numeroValoraciones: 3 }
    ],
    peorValorados: [
      { productoId: 'p5', nombre: 'Webcam', vendedor: 'Mi Tienda', valoracionMedia: 1.33, numeroValoraciones: 3 }
    ],
    aviso: null
  };

  const catalogo: ValoracionesCatalogo = {
    valoracionMediaGlobal: 3.27,
    numeroValoraciones: 22,
    productos: [
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Mi Tienda', valoracionMedia: 4.67, numeroValoraciones: 3 },
      { productoId: 'p6', nombre: 'Hub USB', vendedor: 'Mi Tienda', valoracionMedia: null, numeroValoraciones: 0 }
    ]
  };

  const servicioMock = {
    consultarVentas: vi.fn(),
    consultarValoraciones: vi.fn(),
    consultarValoracionesCatalogo: vi.fn()
  };

  // Tablas en orden: 0 más vendidos, 1 menos vendidos, 2 mejor valorados, 3 peor valorados, 4 catálogo
  const MAS_VENDIDOS = 0;
  const MENOS_VENDIDOS = 1;
  const MEJOR_VALORADOS = 2;
  const PEOR_VALORADOS = 3;
  const CATALOGO = 4;

  function texto(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  function tablas(): HTMLTableElement[] {
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('table') as NodeListOf<HTMLTableElement>);
  }

  // Texto de cada fila, con sus celdas separadas por un espacio
  function filas(tabla: number): string[] {
    return Array.from(tablas()[tabla].querySelectorAll('tbody tr'))
      .map((fila) => Array.from(fila.querySelectorAll('td'))
        .map((celda) => (celda.textContent ?? '').replace(/\s+/g, ' ').trim())
        .join(' '));
  }

  async function crear(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EstadisticasVendedor],
      providers: [
        provideRouter([]),
        { provide: EstadisticasVendedorService, useValue: servicioMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstadisticasVendedor);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    servicioMock.consultarVentas.mockReturnValue(of(ventas));
    servicioMock.consultarValoraciones.mockReturnValue(of(valoraciones));
    servicioMock.consultarValoracionesCatalogo.mockReturnValue(of(catalogo));
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('PBI 276: muestra el Top 10 de más vendidos y de menos vendidos', async () => {
    await crear();

    expect(servicioMock.consultarVentas).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Top 10 más vendidos');
    expect(texto()).toContain('Top 10 menos vendidos');
    expect(filas(MAS_VENDIDOS)).toEqual(['1 Auriculares 15', '2 Teclado 12']);
    expect(filas(MENOS_VENDIDOS)).toEqual(['1 Funda tablet 0']);
  });

  it('PBI 276: si no hay datos suficientes muestra el aviso del backend', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      ...ventas,
      aviso: 'Todavía no tienes ventas en pedidos finalizados: tus productos aparecen con 0 unidades.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no tienes ventas en pedidos finalizados');
  });

  it('PBI 277: muestra el Top 10 de mejor y peor valorados con la media a dos decimales', async () => {
    await crear();

    expect(servicioMock.consultarValoraciones).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Top 10 mejor valorados');
    expect(texto()).toContain('Top 10 peor valorados');
    expect(filas(MEJOR_VALORADOS)).toEqual(['1 Monitor 5.00 / 5 1', '2 Auriculares 4.67 / 5 3']);
    expect(filas(PEOR_VALORADOS)).toEqual(['1 Webcam 1.33 / 5 3']);
  });

  it('PBI 277: sin valoraciones lo indica y muestra el aviso', async () => {
    servicioMock.consultarValoraciones.mockReturnValue(of({
      mejorValorados: [],
      peorValorados: [],
      aviso: 'Todavía no hay valoraciones de tus productos.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no hay valoraciones de tus productos.');
    expect(texto()).toContain('Ningún producto tiene valoraciones todavía.');
    // Quedan las dos de ventas y la del catálogo
    expect(tablas().length).toBe(3);
  });

  it('sin productos lo indica en todas las listas', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      masVendidos: [],
      menosVendidos: [],
      aviso: 'Todavía no tienes productos en tu catálogo.'
    }));
    servicioMock.consultarValoraciones.mockReturnValue(of({ mejorValorados: [], peorValorados: [], aviso: null }));
    servicioMock.consultarValoracionesCatalogo.mockReturnValue(of({
      valoracionMediaGlobal: null,
      numeroValoraciones: 0,
      productos: []
    }));

    await crear();

    expect(texto()).toContain('Todavía no tienes productos en tu catálogo.');
    expect(texto()).toContain('No hay productos que mostrar.');
    expect(texto()).toContain('Tu tienda todavía no tiene valoraciones.');
    expect(tablas().length).toBe(0);
  });

  it('PBI 278: muestra la media de la tienda y la de cada producto del catálogo', async () => {
    await crear();

    expect(servicioMock.consultarValoracionesCatalogo).toHaveBeenCalledTimes(1);
    expect(texto().replace(/\s+/g, ' ')).toContain('Valoración media de tu tienda: 3.27 / 5 (22 valoraciones)');
    expect(filas(CATALOGO)).toEqual(['Auriculares 4.67 / 5 3', 'Hub USB Sin valoraciones 0']);
  });

  it('PBI 278: con una sola valoración lo escribe en singular', async () => {
    servicioMock.consultarValoracionesCatalogo.mockReturnValue(of({ ...catalogo, valoracionMediaGlobal: 4, numeroValoraciones: 1 }));

    await crear();

    expect(texto().replace(/\s+/g, ' ')).toContain('4.00 / 5 (1 valoración)');
  });

  it('si falla un apartado, los demás se siguen viendo', async () => {
    servicioMock.consultarValoraciones.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await crear();

    expect(texto()).toContain('No se han podido cargar las estadísticas. Inténtalo de nuevo.');
    expect(filas(MAS_VENDIDOS)).toEqual(['1 Auriculares 15', '2 Teclado 12']);
  });

  it('si el backend responde 403 explica que solo es para vendedores', async () => {
    servicioMock.consultarVentas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    await crear();

    expect(texto()).toContain('Solo los vendedores pueden consultar las estadísticas de su tienda.');
  });

  it('si la sesión ha caducado lleva al login', async () => {
    servicioMock.consultarVentas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const navegar = vi.spyOn(Router.prototype, 'navigateByUrl').mockResolvedValue(true);

    await crear();

    expect(navegar).toHaveBeenCalledWith('/login');
    expect(texto()).toContain('Tu sesión ha caducado.');
  });

  it('«Actualizar» vuelve a pedir todas las estadísticas', async () => {
    await crear();

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.trim() === 'Actualizar')!;
    boton.click();

    expect(servicioMock.consultarVentas).toHaveBeenCalledTimes(2);
    expect(servicioMock.consultarValoraciones).toHaveBeenCalledTimes(2);
    expect(servicioMock.consultarValoracionesCatalogo).toHaveBeenCalledTimes(2);
  });
});
