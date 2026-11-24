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

import { EstadisticasAdmin, porcentajeBarra } from './estadisticas-admin';
import { EstadisticasAdminService, EstadisticasVendedores } from './estadisticas-admin.service';
import type { EstadisticasValoraciones, EstadisticasVentas } from './estadisticas-vendedor.service';

describe('EstadisticasAdmin', () => {
  let fixture: ComponentFixture<EstadisticasAdmin>;

  const ventas: EstadisticasVentas = {
    masVendidos: [
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Tienda A', unidadesVendidas: 20 },
      { productoId: 'p2', nombre: 'Mochila', vendedor: 'Tienda B', unidadesVendidas: 5 }
    ],
    menosVendidos: [
      { productoId: 'p3', nombre: 'Llavero', vendedor: 'Tienda B', unidadesVendidas: 0 }
    ],
    aviso: null
  };

  const valoraciones: EstadisticasValoraciones = {
    mejorValorados: [
      { productoId: 'p2', nombre: 'Mochila', vendedor: 'Tienda B', valoracionMedia: 4.5, numeroValoraciones: 4 },
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Tienda A', valoracionMedia: 2.5, numeroValoraciones: 2 }
    ],
    peorValorados: [
      { productoId: 'p1', nombre: 'Auriculares', vendedor: 'Tienda A', valoracionMedia: 2.5, numeroValoraciones: 2 }
    ],
    aviso: null
  };

  const vendedores: EstadisticasVendedores = {
    ranking: [
      { vendedor: 'Tienda B', valoracionMedia: 4, numeroValoraciones: 2, productosValorados: 1 },
      { vendedor: 'Tienda A', valoracionMedia: 3.75, numeroValoraciones: 4, productosValorados: 2 }
    ],
    vendedoresSinValoraciones: ['Tienda Nueva', 'Tienda Sur'],
    aviso: null
  };

  const servicioMock = {
    consultarVentas: vi.fn(),
    consultarValoraciones: vi.fn(),
    consultarVendedores: vi.fn()
  };

  // Tablas en orden: 0 más vendidos, 1 menos vendidos, 2 mejor valorados, 3 peor valorados, 4 vendedores
  const MAS_VENDIDOS = 0;
  const MENOS_VENDIDOS = 1;
  const MEJOR_VALORADOS = 2;
  const PEOR_VALORADOS = 3;
  const VENDEDORES = 4;

  function texto(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  function tablas(): HTMLTableElement[] {
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('table') as NodeListOf<HTMLTableElement>);
  }

  // Textos de una celda separados por un espacio (el nombre del producto y el del vendedor van en dos líneas)
  function textoCelda(celda: Element): string {
    const partes: string[] = [];
    const recorrido = document.createTreeWalker(celda, NodeFilter.SHOW_TEXT);
    while (recorrido.nextNode()) {
      const parte = (recorrido.currentNode.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (parte) {
        partes.push(parte);
      }
    }
    return partes.join(' ');
  }

  // Texto de cada fila, con sus celdas separadas por un espacio
  function filas(tabla: number): string[] {
    return Array.from(tablas()[tabla].querySelectorAll('tbody tr'))
      .map((fila) => Array.from(fila.querySelectorAll('td')).map(textoCelda).join(' '));
  }

  function anchosBarras(tabla: number): string[] {
    return Array.from(tablas()[tabla].querySelectorAll<HTMLElement>('.barra-relleno'))
      .map((barra) => barra.style.width);
  }

  async function crear(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EstadisticasAdmin],
      providers: [
        provideRouter([]),
        { provide: EstadisticasAdminService, useValue: servicioMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstadisticasAdmin);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    servicioMock.consultarVentas.mockReturnValue(of(ventas));
    servicioMock.consultarValoraciones.mockReturnValue(of(valoraciones));
    servicioMock.consultarVendedores.mockReturnValue(of(vendedores));
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('la barra es proporcional al valor máximo y nunca pasa del 100 %', () => {
    expect(porcentajeBarra(5, 20)).toBe(25);
    expect(porcentajeBarra(20, 20)).toBe(100);
    expect(porcentajeBarra(30, 20)).toBe(100);
    expect(porcentajeBarra(0, 20)).toBe(0);
    expect(porcentajeBarra(3, 0)).toBe(0);
  });

  it('PBI 279: muestra los más y menos vendidos de todas las tiendas con su vendedor', async () => {
    await crear();

    expect(servicioMock.consultarVentas).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Top 10 más vendidos');
    expect(texto()).toContain('Top 10 menos vendidos');
    expect(filas(MAS_VENDIDOS)).toEqual(['1 Auriculares Tienda A 20', '2 Mochila Tienda B 5']);
    expect(filas(MENOS_VENDIDOS)).toEqual(['1 Llavero Tienda B 0']);
  });

  it('PBI 279: las barras de las dos listas usan como escala el producto más vendido', async () => {
    await crear();

    expect(anchosBarras(MAS_VENDIDOS)).toEqual(['100%', '25%']);
    expect(anchosBarras(MENOS_VENDIDOS)).toEqual(['0%']);
  });

  it('PBI 279: si no hay datos suficientes muestra el aviso del backend', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      ...ventas,
      aviso: 'Todavía no hay ventas en pedidos finalizados: los productos aparecen con 0 unidades.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no hay ventas en pedidos finalizados');
  });

  it('sin productos lo indica en las dos listas', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      masVendidos: [],
      menosVendidos: [],
      aviso: 'Todavía no hay productos en la plataforma.'
    }));
    servicioMock.consultarValoraciones.mockReturnValue(of({ mejorValorados: [], peorValorados: [], aviso: null }));
    servicioMock.consultarVendedores.mockReturnValue(of({
      ranking: [],
      vendedoresSinValoraciones: [],
      aviso: 'Ningún vendedor tiene valoraciones todavía.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no hay productos en la plataforma.');
    expect(texto()).toContain('No hay productos que mostrar.');
    expect(texto()).toContain('Ningún producto tiene valoraciones todavía.');
    expect(tablas().length).toBe(0);
  });

  it('PBI 280: muestra los mejor y peor valorados de todas las tiendas con su vendedor y su media', async () => {
    await crear();

    expect(servicioMock.consultarValoraciones).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Top 10 mejor valorados');
    expect(texto()).toContain('Top 10 peor valorados');
    expect(filas(MEJOR_VALORADOS)).toEqual(['1 Mochila Tienda B 4.50 / 5 4', '2 Auriculares Tienda A 2.50 / 5 2']);
    expect(filas(PEOR_VALORADOS)).toEqual(['1 Auriculares Tienda A 2.50 / 5 2']);
  });

  it('PBI 280: la barra de cada media se dibuja sobre la puntuación máxima (5)', async () => {
    await crear();

    expect(anchosBarras(MEJOR_VALORADOS)).toEqual(['90%', '50%']);
  });

  it('PBI 280: si hay pocas valoraciones muestra el aviso del backend', async () => {
    servicioMock.consultarValoraciones.mockReturnValue(of({
      ...valoraciones,
      aviso: 'Menos de 10 productos tienen valoraciones: las dos listas muestran todos los valorados.'
    }));

    await crear();

    expect(texto()).toContain('Menos de 10 productos tienen valoraciones');
  });

  it('PBI 281: muestra el ranking de vendedores con su media, valoraciones y productos valorados', async () => {
    await crear();

    expect(servicioMock.consultarVendedores).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Top 10 vendedores por valoración');
    expect(filas(VENDEDORES)).toEqual(['1 Tienda B 4.00 / 5 2 1', '2 Tienda A 3.75 / 5 4 2']);
    expect(anchosBarras(VENDEDORES)).toEqual(['80%', '75%']);
  });

  it('PBI 281: indica aparte los vendedores sin valoraciones, que no entran en el ranking', async () => {
    await crear();

    expect(texto().replace(/\s+/g, ' '))
      .toContain('Sin valoraciones (no entran en el ranking): Tienda Nueva, Tienda Sur.');
  });

  it('PBI 281: sin vendedores valorados lo indica y no muestra la tabla', async () => {
    servicioMock.consultarVendedores.mockReturnValue(of({
      ranking: [],
      vendedoresSinValoraciones: ['Tienda A'],
      aviso: 'Ningún vendedor tiene valoraciones todavía.'
    }));

    await crear();

    expect(texto()).toContain('Ningún vendedor tiene valoraciones todavía.');
    // Quedan las cuatro tablas de ventas y valoraciones
    expect(tablas().length).toBe(4);
  });

  it('si falla un apartado, los demás se siguen viendo', async () => {
    servicioMock.consultarValoraciones.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await crear();

    expect(texto()).toContain('No se han podido cargar las estadísticas. Inténtalo de nuevo.');
    expect(filas(MAS_VENDIDOS)).toEqual(['1 Auriculares Tienda A 20', '2 Mochila Tienda B 5']);
  });

  it('si el backend responde 403 explica que solo es para administradores', async () => {
    servicioMock.consultarVentas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    await crear();

    expect(texto()).toContain('Solo los administradores pueden consultar las estadísticas de la plataforma.');
  });

  it('si la sesión ha caducado lleva al login', async () => {
    servicioMock.consultarVentas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const navegar = vi.spyOn(Router.prototype, 'navigateByUrl').mockResolvedValue(true);

    await crear();

    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('«Actualizar» vuelve a pedir todas las estadísticas', async () => {
    await crear();

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.trim() === 'Actualizar')!;
    boton.click();

    expect(servicioMock.consultarVentas).toHaveBeenCalledTimes(2);
    expect(servicioMock.consultarValoraciones).toHaveBeenCalledTimes(2);
    expect(servicioMock.consultarVendedores).toHaveBeenCalledTimes(2);
  });
});
