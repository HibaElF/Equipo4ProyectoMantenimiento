import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { Alertas } from './alertas';

describe('Alertas', () => {
  let fixture: ComponentFixture<Alertas>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/cliente/alertas`;
  const alertaNueva = {
    id: 'a1',
    tipo: 'BAJADA_PRECIO',
    productoId: 'p1',
    mensaje: '«Teclado», de tus favoritos, ha bajado de 20,00 € a 15,00 €.',
    fecha: '2026-11-24T10:00:00Z',
    leida: false
  };
  const texto = (): string => {
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Alertas],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    fixture = TestBed.createComponent(Alertas);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('sin alertas muestra el estado vacío', () => {
    http.expectOne(url).flush({ alertas: [], noLeidas: 0 });

    expect(texto()).toContain('No tienes alertas');
  });

  it('lista las alertas con su tipo y marca las nuevas', () => {
    http.expectOne(url).flush({ alertas: [alertaNueva], noLeidas: 1 });

    expect(texto()).toContain('1 alerta sin leer');
    expect(texto()).toContain('Bajada de precio');
    expect(texto()).toContain('Nueva');
    expect(texto()).toContain('ha bajado de 20,00 € a 15,00 €');
  });

  it('marcar como leída actualiza la lista', () => {
    http.expectOne(url).flush({ alertas: [alertaNueva], noLeidas: 1 });
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.alerta-acciones button');
    expect(boton.textContent).toContain('Marcar como leída');
    boton.click();
    http.expectOne(`${environment.apiUrl}/usuarios/csrf`).flush({ token: 't' });
    http.expectOne(`${url}/a1/leida`).flush({ alertas: [{ ...alertaNueva, leida: true }], noLeidas: 0 });

    expect(texto()).toContain('0 alertas sin leer');
    expect(texto()).not.toContain('Marcar como leída');
  });

  it('si falla la carga muestra el error con «Reintentar»', () => {
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });

    expect(texto()).toContain('No se pudieron cargar tus alertas.');
    expect(texto()).not.toContain('No tienes alertas');
  });
});
