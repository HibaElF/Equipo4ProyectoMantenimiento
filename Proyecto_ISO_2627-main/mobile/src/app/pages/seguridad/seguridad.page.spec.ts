import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Perfil } from '../../core/models/perfil';
import { PerfilService } from '../../core/services/perfil.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
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
    // En el navegador (tests) no se ofrece abrir la app de autenticación: solo clave y QR.
    expect(pagina.esAppInstalada).toBe(false);
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

describe('SeguridadPage: desactivar y copiar', () => {
  const api = { consultar: vi.fn(), desactivarSegundoFactor: vi.fn() };

  function crear(p: Perfil) {
    const falsos = controladoresFalsos();
    api.consultar.mockReturnValue(of(p));
    TestBed.configureTestingModule({
      imports: [SeguridadPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PerfilService, useValue: api }, ...falsos.providers]
    });
    const pagina = TestBed.createComponent(SeguridadPage).componentInstance;
    pagina.ionViewWillEnter();
    return { pagina, ...falsos };
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('desactivar exige un código válido y una confirmación', async () => {
    api.desactivarSegundoFactor.mockReturnValue(of(undefined));
    const { pagina, alertas } = crear(perfil(true));
    pagina.codigo = 'x';
    await pagina.desactivar();
    expect(alertas.creadas.length).toBe(0);
    expect(pagina.errorTotp()).toContain('Introduce un código actual');

    pagina.codigo = 'abcd 2345';
    await pagina.desactivar();
    alertas.pulsar('Desactivar');
    expect(api.desactivarSegundoFactor).toHaveBeenCalledWith('ABCD2345');
    expect(pagina.perfil()?.totpActivado).toBe(false);
    expect(pagina.mensajeTotp()).toBe('Segundo factor desactivado.');
  });

  it('código rechazado por el servidor', async () => {
    api.desactivarSegundoFactor.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'El código no es válido.' } })));
    const { pagina, alertas } = crear(perfil(true));
    pagina.codigo = '123456';
    await pagina.desactivar();
    alertas.pulsar('Desactivar');
    expect(pagina.errorTotp()).toBe('El código no es válido.');
    expect(pagina.perfil()?.totpActivado).toBe(true);
  });

  it('copia la clave sin espacios y avisa si no se puede copiar', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    const { pagina, toasts } = crear(perfil(false));
    pagina.configuracion.set({ otpauthUri: 'otpauth://totp/E:a?secret=JBSWY3DPEHPK3PXP', qrDataUrl: null });
    pagina.copiarClave();
    await Promise.resolve();
    await Promise.resolve();
    expect(escribir).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
    expect(toasts.mensajes).toContain('Clave copiada.');

    escribir.mockRejectedValue(new Error('sin permiso'));
    await pagina.copiar('AAAA', 'Códigos');
    expect(toasts.mensajes.at(-1)).toBe('No se pudo copiar. Anótalo a mano.');
  });
});
