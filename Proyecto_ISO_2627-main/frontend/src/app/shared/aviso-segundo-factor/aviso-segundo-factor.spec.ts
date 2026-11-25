import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { olvidarSesion } from '../../pages/login/marca-sesion';
import { PerfilResponse, PerfilService } from '../../pages/perfil/perfil.service';
import { AvisoSegundoFactor } from './aviso-segundo-factor';
import { EstadoSegundoFactor } from './estado-segundo-factor';

@Component({ template: '' })
class PaginaVacia {}

const perfilDe = (tipoUsuario: string, totpActivado: boolean) =>
  of({ tipoUsuario, totpActivado } as unknown as PerfilResponse);

// T-27: aviso no bloqueante para que los clientes activen el segundo factor.
describe('AvisoSegundoFactor (T-27)', () => {
  let fixture: ComponentFixture<AvisoSegundoFactor>;
  const perfilMock = { consultarPerfil: vi.fn<() => Observable<PerfilResponse>>() };

  const crear = (perfil: Observable<PerfilResponse>): HTMLElement => {
    perfilMock.consultarPerfil.mockReturnValue(perfil);
    fixture = TestBed.createComponent(AvisoSegundoFactor);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AvisoSegundoFactor],
      providers: [
        provideRouter([{ path: '**', component: PaginaVacia }]),
        { provide: PerfilService, useValue: perfilMock }
      ]
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    perfilMock.consultarPerfil.mockReset();
    TestBed.resetTestingModule();
  });

  it('se muestra a un cliente sin TOTP, con un enlace a la configuración del perfil', () => {
    const raiz = crear(perfilDe('CLIENTE', false));

    const aviso = raiz.querySelector('.aviso-segundo-factor');
    expect(aviso).not.toBeNull();
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.textContent).toContain('segundo factor');
    const enlace = raiz.querySelector('.aviso-enlace') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('/perfil#segundo-factor-titulo');
  });

  it('no bloquea el uso: no es un diálogo modal y no pide nada para seguir', () => {
    const raiz = crear(perfilDe('CLIENTE', false));

    expect(raiz.querySelector('[aria-modal]')).toBeNull();
    expect(raiz.querySelector('dialog')).toBeNull();
    expect(raiz.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('no se muestra a un cliente que ya tiene el segundo factor', () => {
    expect(crear(perfilDe('CLIENTE', true)).querySelector('.aviso-segundo-factor')).toBeNull();
  });

  it('no se muestra a vendedores ni a administradores', () => {
    expect(crear(perfilDe('VENDEDOR', false)).querySelector('.aviso-segundo-factor')).toBeNull();
    fixture.destroy();
    expect(crear(perfilDe('ADMIN', false)).querySelector('.aviso-segundo-factor')).toBeNull();
  });

  it('no se muestra si no se puede consultar el perfil', () => {
    const raiz = crear(throwError(() => new HttpErrorResponse({ status: 401 })));

    expect(raiz.querySelector('.aviso-segundo-factor')).toBeNull();
  });

  it('se descarta y no reaparece en la misma sesión del navegador', () => {
    const raiz = crear(perfilDe('CLIENTE', false));

    (raiz.querySelector('.aviso-descartar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.aviso-segundo-factor')).toBeNull();

    fixture.destroy();
    expect(crear(perfilDe('CLIENTE', false)).querySelector('.aviso-segundo-factor')).toBeNull();
  });

  it('vuelve a mostrarse tras cerrar la sesión', () => {
    const raiz = crear(perfilDe('CLIENTE', false));
    (raiz.querySelector('.aviso-descartar') as HTMLButtonElement).click();
    fixture.destroy();

    olvidarSesion();

    expect(crear(perfilDe('CLIENTE', false)).querySelector('.aviso-segundo-factor')).not.toBeNull();
  });

  it('desaparece en cuanto el cliente activa el segundo factor', () => {
    const raiz = crear(perfilDe('CLIENTE', false));
    expect(raiz.querySelector('.aviso-segundo-factor')).not.toBeNull();

    TestBed.inject(EstadoSegundoFactor).activado.set(true);
    fixture.detectChanges();

    expect(raiz.querySelector('.aviso-segundo-factor')).toBeNull();
  });

  it('sigue funcionando si sessionStorage no está disponible', () => {
    const espia = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const raiz = crear(perfilDe('CLIENTE', false));

    expect(raiz.querySelector('.aviso-segundo-factor')).not.toBeNull();
    espia.mockRestore();
  });
});
