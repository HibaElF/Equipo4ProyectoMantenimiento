import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
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

  it('borrar quita la alerta de la lista', () => {
    http.expectOne(url).flush({ alertas: [alertaNueva], noLeidas: 1 });
    fixture.detectChanges();

    const borrar: HTMLButtonElement = fixture.nativeElement.querySelector('.alerta-acciones .boton-peligro');
    borrar.click();
    http.expectOne(`${environment.apiUrl}/usuarios/csrf`).flush({ token: 't' });
    const peticion = http.expectOne(`${url}/a1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({ alertas: [], noLeidas: 0 });

    expect(texto()).toContain('Alerta borrada.');
    expect(texto()).toContain('No tienes alertas');
  });

  it('borrar todas pide confirmación y solo borra si se acepta', async () => {
    http.expectOne(url).flush({ alertas: [alertaNueva], noLeidas: 1 });
    fixture.detectChanges();
    const confirmacion = TestBed.inject(ConfirmacionService);
    const botonBorrarTodas = (): HTMLButtonElement =>
      fixture.nativeElement.querySelector('.alertas-acciones-generales .boton-peligro');

    botonBorrarTodas().click();
    confirmacion.responder(false);
    await fixture.whenStable();
    http.expectNone(`${environment.apiUrl}/usuarios/csrf`);

    botonBorrarTodas().click();
    expect(confirmacion.solicitud()?.aceptar).toBe('Borrar todas');
    confirmacion.responder(true);
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/usuarios/csrf`).flush({ token: 't' });
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({ alertas: [], noLeidas: 0 });

    expect(texto()).toContain('Se han borrado todas tus alertas.');
  });

  it('si falla la carga muestra el error con «Reintentar»', () => {
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });

    expect(texto()).toContain('No se pudieron cargar tus alertas.');
    expect(texto()).not.toContain('No tienes alertas');
  });
});
