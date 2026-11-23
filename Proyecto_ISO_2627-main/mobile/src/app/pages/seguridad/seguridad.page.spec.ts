import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Perfil } from '../../core/models/perfil';
import { PerfilService } from '../../core/services/perfil.service';
import { SeguridadPage, esCodigoDesactivacion, esCodigoTotp } from './seguridad.page';

const perfil = (totpActivado: boolean, emailOtpActivado = false): Perfil => ({
  tipoUsuario: 'CLIENTE', nombre: 'Ana', apellidos: 'Ruiz', email: 'a@x.es', telefono: null, imagenPerfil: null,
  dniNif: null, fechaNacimiento: null, esPremium: false, totpActivado, emailOtpActivado
});

describe('SeguridadPage', () => {
  const api = { consultar: vi.fn(), configurarSegundoFactor: vi.fn(), confirmarSegundoFactor: vi.fn(), cambiarTercerFactor: vi.fn() };

  function crear(p: Perfil) {
    api.consultar.mockReturnValue(of(p));
    TestBed.configureTestingModule({
      imports: [SeguridadPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PerfilService, useValue: api }]
    });
    const pagina = TestBed.createComponent(SeguridadPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('formatos de código como en la web', () => {
    expect(esCodigoTotp('123 456')).toBe(true);
    expect(esCodigoTotp('12345')).toBe(false);
    expect(esCodigoDesactivacion('abcd-2345')).toBe(true);
    expect(esCodigoDesactivacion('123456')).toBe(true);
    expect(esCodigoDesactivacion('abc')).toBe(false);
  });

  it('configura y confirma el segundo factor mostrando los códigos de respaldo', () => {
    api.configurarSegundoFactor.mockReturnValue(
      of({ otpauthUri: 'otpauth://totp/E:a?secret=JBSWY3DPEHPK3PXP', qrDataUrl: 'data:x', enabled: false })
    );
    api.confirmarSegundoFactor.mockReturnValue(of({ enabled: true, backupCodes: ['AAAA2222', 'BBBB3333'] }));
    const pagina = crear(perfil(false));
    pagina.configurar();
    expect(pagina.secreto()).toBe('JBSW Y3DP EHPK 3PXP');
    pagina.codigo = '12';
    pagina.confirmar();
    expect(api.confirmarSegundoFactor).not.toHaveBeenCalled();
    expect(pagina.errorTotp()).toBe('Introduce un código TOTP de 6 cifras.');
    pagina.codigo = '123 456';
    pagina.confirmar();
    expect(api.confirmarSegundoFactor).toHaveBeenCalledWith('123456');
    expect(pagina.perfil()?.totpActivado).toBe(true);
    expect(pagina.codigosRespaldo()).toEqual(['AAAA2222', 'BBBB3333']);
  });

  it('no deja desactivar TOTP con la verificación por correo activa', async () => {
    const pagina = crear(perfil(true, true));
    pagina.codigo = '123456';
    await pagina.desactivar();
    expect(pagina.errorTotp()).toBe('Desactiva primero la verificación por correo.');
  });

  it('el tercer factor exige tener activado el segundo', () => {
    const pagina = crear(perfil(false));
    const toggle = { checked: true } as HTMLIonToggleElement;
    pagina.cambiarCorreo({ detail: { checked: true }, target: toggle } as unknown as CustomEvent<{ checked: boolean }>);
    expect(api.cambiarTercerFactor).not.toHaveBeenCalled();
    expect(toggle.checked).toBe(false);
    expect(pagina.errorCorreo()).toBe('Activa primero la verificación con tu aplicación de autenticación.');
  });

  it('activa el tercer factor y si falla muestra el error', () => {
    api.cambiarTercerFactor.mockReturnValue(of(undefined));
    const pagina = crear(perfil(true));
    const toggle = { checked: true } as HTMLIonToggleElement;
    pagina.cambiarCorreo({ detail: { checked: true }, target: toggle } as unknown as CustomEvent<{ checked: boolean }>);
    expect(api.cambiarTercerFactor).toHaveBeenCalledWith(true);
    expect(pagina.perfil()?.emailOtpActivado).toBe(true);

    api.cambiarTercerFactor.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    pagina.cambiarCorreo({ detail: { checked: false }, target: toggle } as unknown as CustomEvent<{ checked: boolean }>);
    expect(pagina.errorCorreo()).toBe('No se pudo actualizar la configuración de seguridad.');
    expect(pagina.perfil()?.emailOtpActivado).toBe(true);
  });
});
