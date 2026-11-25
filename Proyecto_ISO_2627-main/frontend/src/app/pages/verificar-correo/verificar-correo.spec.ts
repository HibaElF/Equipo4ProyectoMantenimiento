import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerificarCorreo } from './verificar-correo';
import { VerificarCorreoService } from './verificar-correo.service';

describe('VerificarCorreo', () => {
  const servicio = { verificar: vi.fn<VerificarCorreoService['verificar']>() };

  const crear = (token: string | null) => {
    TestBed.configureTestingModule({
      imports: [VerificarCorreo],
      providers: [
        provideRouter([]),
        { provide: VerificarCorreoService, useValue: servicio },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => token } } }
        }
      ]
    });
    const fixture = TestBed.createComponent(VerificarCorreo);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => {
    servicio.verificar.mockReset();
    TestBed.resetTestingModule();
  });

  it('verifica el token del enlace y muestra la confirmación', () => {
    servicio.verificar.mockReturnValue(of(undefined));

    const fixture = crear('token-del-correo');

    expect(servicio.verificar).toHaveBeenCalledWith('token-del-correo');
    expect(fixture.componentInstance.estado()).toBe('verificado');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Correo confirmado');
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('muestra «comprobando» mientras espera la respuesta', () => {
    servicio.verificar.mockReturnValue(NEVER);

    const fixture = crear('token-del-correo');

    expect(fixture.componentInstance.estado()).toBe('verificando');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comprobando el enlace');
  });

  it('sin token en la URL no llama al servidor y muestra el error genérico', () => {
    const fixture = crear(null);

    expect(servicio.verificar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.estado()).toBe('error');
    expect(fixture.componentInstance.mensajeError()).toBe('El enlace de verificación no es válido o ha caducado.');
  });

  it('un enlace caducado o ya usado muestra el error del servidor y ofrece recuperar la contraseña', () => {
    servicio.verificar.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { error: 'El enlace de verificación no es válido o ha caducado.' }
    })));

    const fixture = crear('token-caducado');
    const raiz = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.estado()).toBe('error');
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('ha caducado');
    expect(raiz.querySelector('a[href="/recuperar-contrasena"]')).not.toBeNull();
  });

  it.each([
    [0, 'No se pudo conectar'],
    [429, 'Demasiados intentos'],
    [500, 'El enlace de verificación no es válido o ha caducado.']
  ])('con el estado %s no muestra detalles internos', (status, esperado) => {
    servicio.verificar.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status, error: { error: 'detalle interno del servidor' } })));

    const fixture = crear('token');

    expect(fixture.componentInstance.mensajeError()).toContain(esperado);
    expect(fixture.componentInstance.mensajeError()).not.toContain('detalle interno');
  });
});
