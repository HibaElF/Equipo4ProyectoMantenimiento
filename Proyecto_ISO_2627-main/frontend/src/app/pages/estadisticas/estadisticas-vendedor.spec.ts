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
  EstadisticasVendedorService,
  EstadisticasVentas
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

  const servicioMock = {
    consultarVentas: vi.fn()
  };

  function texto(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  function filas(tabla: number): string[] {
    fixture.detectChanges();
    const tablas = fixture.nativeElement.querySelectorAll('table') as NodeListOf<HTMLTableElement>;
    return Array.from(tablas[tabla].querySelectorAll('tbody tr'))
      .map((fila) => (fila.textContent ?? '').replace(/\s+/g, ' ').trim());
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
    expect(filas(0)).toEqual(['1 Auriculares 15', '2 Teclado 12']);
    expect(filas(1)).toEqual(['1 Funda tablet 0']);
  });

  it('PBI 276: si no hay datos suficientes muestra el aviso del backend', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      ...ventas,
      aviso: 'Todavía no tienes ventas en pedidos finalizados: tus productos aparecen con 0 unidades.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no tienes ventas en pedidos finalizados');
  });

  it('PBI 276: sin productos lo indica en las dos listas', async () => {
    servicioMock.consultarVentas.mockReturnValue(of({
      masVendidos: [],
      menosVendidos: [],
      aviso: 'Todavía no tienes productos en tu catálogo.'
    }));

    await crear();

    expect(texto()).toContain('Todavía no tienes productos en tu catálogo.');
    expect(texto()).toContain('No hay productos que mostrar.');
    expect(fixture.nativeElement.querySelectorAll('table').length).toBe(0);
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

  it('«Actualizar» vuelve a pedir las estadísticas', async () => {
    await crear();

    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.trim() === 'Actualizar')!;
    boton.click();

    expect(servicioMock.consultarVentas).toHaveBeenCalledTimes(2);
  });
});
