import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Perfil } from './perfil';
import { PerfilResponse, PerfilService } from './perfil.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { PagosService } from '../pagos/pagos.service';
// M8: la confirmación es un diálogo propio (asíncrono); se simula su respuesta.
const simularConfirmacion = (aceptada: boolean) =>
  vi.spyOn(TestBed.inject(ConfirmacionService), 'confirmar').mockResolvedValue(aceptada);
const esperarConfirmacion = () => new Promise<void>((resolver) => setTimeout(resolver));


const perfilCliente: PerfilResponse = {
  tipoUsuario: 'CLIENTE', nombre: 'Ana', apellidos: 'García',
  email: 'ana@esibuy.com', telefono: '******123', imagenPerfil: null,
  dniNif: '12*******', fechaNacimiento: null, esPremium: true,
  nombreComercial: null, categoria: null, sede: null,
  fechaIncorporacion: null, rol: null, totpActivado: false, emailOtpActivado: false,
};

// PBI 290: método de pago del cliente para hacerse Premium
const metodoPagoCliente = {
  id: 'mp-1', tipo: 'TARJETA', nombre: 'Mi visa', datosEnmascarados: '**** **** **** 1111',
};

const perfilVendedor: PerfilResponse = {
  tipoUsuario: 'VENDEDOR', nombre: 'Luis', apellidos: 'Martín',
  email: 'luis@esibuy.com', telefono: null, imagenPerfil: null,
  dniNif: '45*******', fechaNacimiento: null, esPremium: null,
  nombreComercial: 'UrbanStyle', categoria: 'Tecnología', sede: null,
  fechaIncorporacion: null, rol: null, categoriaId: 'cat-1', totpActivado: false, emailOtpActivado: false,
};

const perfilAdministrador: PerfilResponse = {
  tipoUsuario: 'ADMIN', nombre: 'Ada', apellidos: 'Admin',
  email: 'admin@esibuy.com', telefono: null, imagenPerfil: null,
  dniNif: null, fechaNacimiento: null, esPremium: null,
  nombreComercial: null, categoria: null, sede: 'Central',
  fechaIncorporacion: '2026-01-01', rol: 'ADMIN', totpActivado: false, emailOtpActivado: false,
};

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let componente: Perfil;
  let perfilServiceMock: {
    consultarPerfil: ReturnType<typeof vi.fn>;
    obtenerCategorias: ReturnType<typeof vi.fn>;
    modificarPerfil: ReturnType<typeof vi.fn>;
    cambiarTipoCliente: ReturnType<typeof vi.fn>;
    confirmarSegundoFactor: ReturnType<typeof vi.fn>;
    desactivarSegundoFactor: ReturnType<typeof vi.fn>;
    cambiarContrasena: ReturnType<typeof vi.fn>;
    modificarPreferenciaTercerFactor: ReturnType<typeof vi.fn>;
    darDeBajaCuenta: ReturnType<typeof vi.fn>;
    descargarMisDatos: ReturnType<typeof vi.fn>;
  };
  let pagosServiceMock: {
    consultarMetodos: ReturnType<typeof vi.fn>;
  };

  function crearComponente(respuesta: Observable<PerfilResponse>) {
    perfilServiceMock.consultarPerfil.mockReturnValue(respuesta);
    fixture = TestBed.createComponent(Perfil);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    perfilServiceMock = {
      consultarPerfil: vi.fn(),
      obtenerCategorias: vi.fn(() => of([])),
      modificarPerfil: vi.fn(),
      cambiarTipoCliente: vi.fn(),
      confirmarSegundoFactor: vi.fn(),
      desactivarSegundoFactor: vi.fn(),
      cambiarContrasena: vi.fn(),
      darDeBajaCuenta: vi.fn(),
      descargarMisDatos: vi.fn(),
      modificarPreferenciaTercerFactor: vi.fn(),
    };
    pagosServiceMock = {
      consultarMetodos: vi.fn(() => of([metodoPagoCliente])),
    };
    // jsdom no implementa scrollTo
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: PerfilService, useValue: perfilServiceMock },
        { provide: PagosService, useValue: pagosServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('carga y muestra el perfil del cliente', () => {
    crearComponente(of(perfilCliente));

    expect(componente.perfil()).toEqual(perfilCliente);
    expect(componente.cargando()).toBe(false);
    expect(fixture.nativeElement.querySelector('.profile-type').textContent.trim()).toBe('Cliente');
    expect(fixture.nativeElement.textContent).toContain('Ana García');
    expect(fixture.nativeElement.textContent).toContain('12*******');
  });

  it('no repite «Volver al panel»: esa navegación está en la cabecera común (A18)', () => {
    crearComponente(of(perfilCliente));

    expect(fixture.nativeElement.textContent).not.toContain('Volver al panel');
    expect(fixture.nativeElement.textContent).toContain('Mis direcciones');
  });

  it('requiere un codigo antes de solicitar la desactivacion de TOTP', () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true, emailOtpActivado: false, }));
    componente.desactivarTOTP();
    expect(perfilServiceMock.desactivarSegundoFactor).not.toHaveBeenCalled();
    expect(componente.perfil()?.totpActivado).toBe(true);
    expect(componente.errorTOTP()).toContain('Introduce un código');
  });

  it('envia el codigo escrito en el formulario y limpia los respaldos al desactivar', async () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true, emailOtpActivado: false, }));
    await fixture.whenStable();
    const entrada: HTMLInputElement = fixture.nativeElement.querySelector('#totp-disable-code');
    entrada.value = '081804';
    entrada.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    simularConfirmacion(true);
    perfilServiceMock.desactivarSegundoFactor.mockReturnValue(of(undefined));
    componente.codigosRespaldo.set(['ABCDEFGH234567AB']);

    await componente.desactivarTOTP();

    expect(perfilServiceMock.desactivarSegundoFactor).toHaveBeenCalledWith('081804');
    expect(componente.perfil()?.totpActivado).toBe(false);
    expect(componente.codigoTOTP()).toBe('');
    expect(componente.codigosRespaldo()).toEqual([]);
  });

  it('mantiene TOTP activado y muestra el bloqueo temporal si se agotan los intentos', async () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true, emailOtpActivado: false, }));
    componente.codigoTOTP.set('123456');
    simularConfirmacion(true);
    perfilServiceMock.desactivarSegundoFactor.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 429, error: { error: 'Espera 5 minutos.' } })));
    await componente.desactivarTOTP();
    expect(componente.perfil()?.totpActivado).toBe(true);
    expect(componente.errorTOTP()).toBe('Espera 5 minutos.');
    expect(componente.cargandoTOTP()).toBe(false);
  });

  describe('cambio de contraseña (T-05)', () => {
    const rellenar = (actual: string, nueva: string, confirmar: string) =>
      componente.formularioContrasena.setValue({
        contrasenaActual: actual, nuevaContrasena: nueva, confirmarContrasena: confirmar,
      });

    it('muestra el formulario de cambio de contraseña en la sección de seguridad', () => {
      crearComponente(of(perfilCliente));

      const formulario = fixture.nativeElement.querySelector('#cambiar-contrasena-titulo');
      expect(formulario?.textContent).toContain('Cambiar contraseña');
      expect(fixture.nativeElement.querySelector('#contrasena-actual')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#contrasena-nueva')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#contrasena-confirmar')).not.toBeNull();
    });

    it('no envía el formulario incompleto o con una contraseña demasiado corta', () => {
      crearComponente(of(perfilCliente));

      componente.cambiarContrasena();
      rellenar('ClaveActual9!x', 'corta', 'corta');
      componente.cambiarContrasena();

      expect(perfilServiceMock.cambiarContrasena).not.toHaveBeenCalled();
      expect(componente.errorContrasena()).toContain('al menos 8 caracteres');
    });

    it('no envía la contraseña nueva si la confirmación no coincide', () => {
      crearComponente(of(perfilCliente));

      rellenar('ClaveActual9!x', 'NuevaClaveSegura7#', 'OtraDistinta7#');
      componente.cambiarContrasena();

      expect(perfilServiceMock.cambiarContrasena).not.toHaveBeenCalled();
      expect(componente.errorContrasena()).toContain('no coinciden');
    });

    it('cambia la contraseña, limpia el formulario y avisa del cierre de otras sesiones', () => {
      crearComponente(of(perfilCliente));
      perfilServiceMock.cambiarContrasena.mockReturnValue(of(undefined));

      rellenar('ClaveActual9!x', 'NuevaClaveSegura7#', 'NuevaClaveSegura7#');
      componente.cambiarContrasena();

      expect(perfilServiceMock.cambiarContrasena).toHaveBeenCalledWith({
        contrasenaActual: 'ClaveActual9!x',
        nuevaContrasena: 'NuevaClaveSegura7#',
      });
      expect(componente.formularioContrasena.getRawValue()).toEqual({
        contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '',
      });
      expect(componente.mensajeContrasena()).toContain('otras sesiones');
      expect(componente.errorContrasena()).toBe('');
      expect(componente.cambiandoContrasena()).toBe(false);
    });

    it('muestra el mensaje del servidor si la contraseña actual es incorrecta o incumple la política', () => {
      crearComponente(of(perfilCliente));
      perfilServiceMock.cambiarContrasena.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 400, error: { error: 'La contraseña actual no es correcta.' } })));

      rellenar('Incorrecta1!', 'NuevaClaveSegura7#', 'NuevaClaveSegura7#');
      componente.cambiarContrasena();

      expect(componente.errorContrasena()).toBe('La contraseña actual no es correcta.');
      expect(componente.mensajeContrasena()).toBe('');
      expect(componente.cambiandoContrasena()).toBe(false);
      // No se borra lo escrito para poder corregirlo.
      expect(componente.formularioContrasena.getRawValue().nuevaContrasena).toBe('NuevaClaveSegura7#');
    });

    it('muestra el bloqueo temporal cuando se agotan los intentos', () => {
      crearComponente(of(perfilCliente));
      perfilServiceMock.cambiarContrasena.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 429, error: { error: 'Demasiados intentos. Espera 30 segundos.' } })));

      rellenar('Incorrecta1!', 'NuevaClaveSegura7#', 'NuevaClaveSegura7#');
      componente.cambiarContrasena();

      expect(componente.errorContrasena()).toBe('Demasiados intentos. Espera 30 segundos.');
    });

    it('usa un mensaje genérico si el servidor falla', () => {
      crearComponente(of(perfilCliente));
      perfilServiceMock.cambiarContrasena.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 500, error: { error: 'detalle interno' } })));

      rellenar('ClaveActual9!x', 'NuevaClaveSegura7#', 'NuevaClaveSegura7#');
      componente.cambiarContrasena();

      expect(componente.errorContrasena()).toBe('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
    });
  });

  it('muestra la tarjeta de tipo y el boton Premium para un cliente normal', () => {
    crearComponente(of({ ...perfilCliente, esPremium: false }));

    expect(fixture.nativeElement.querySelector('.account-type-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Hacerme cliente Premium');
    expect(fixture.nativeElement.textContent).toContain('Ventajas Premium');
  });

  it('no muestra el cambio de tipo para vendedor ni administrador', () => {
    crearComponente(of(perfilVendedor));
    expect(fixture.nativeElement.querySelector('.account-type-card')).toBeNull();

    fixture.destroy();
    crearComponente(of(perfilAdministrador));
    expect(fixture.nativeElement.querySelector('.account-type-card')).toBeNull();
  });

  it('solo ofrece la baja de cuenta a clientes y vendedores', () => {
    crearComponente(of(perfilCliente));
    expect(fixture.nativeElement.textContent).toContain('Eliminar mi cuenta');

    fixture.destroy();
    crearComponente(of(perfilVendedor));
    expect(fixture.nativeElement.textContent).toContain('Eliminar mi cuenta');

    fixture.destroy();
    crearComponente(of(perfilAdministrador));
    expect(fixture.nativeElement.textContent).not.toContain('Eliminar mi cuenta');
  });

  it('exige dos confirmaciones y permite cancelar sin enviar la baja', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarBaja();
    componente.cancelarBaja();
    expect(componente.pasoConfirmacionBaja()).toBe(0);
    expect(perfilServiceMock.darDeBajaCuenta).not.toHaveBeenCalled();

    componente.iniciarBaja();
    componente.continuarBaja();
    expect(componente.pasoConfirmacionBaja()).toBe(2);
    expect(perfilServiceMock.darDeBajaCuenta).not.toHaveBeenCalled();
    componente.cancelarBaja();
    expect(perfilServiceMock.darDeBajaCuenta).not.toHaveBeenCalled();
  });

  it('envía la baja tras confirmar dos veces y vuelve al inicio de sesión', () => {
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');
    crearComponente(of(perfilCliente));
    perfilServiceMock.darDeBajaCuenta.mockReturnValue(of(undefined));

    componente.iniciarBaja();
    componente.continuarBaja();
    componente.continuarBaja();

    expect(perfilServiceMock.darDeBajaCuenta).toHaveBeenCalledWith('CLIENTE');
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'cuenta-eliminada' } });
  });

  it('muestra el rechazo de baja cuando el vendedor tiene pedidos pendientes', () => {
    crearComponente(of(perfilVendedor));
    perfilServiceMock.darDeBajaCuenta.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 409, error: { error: 'No puedes darte de baja porque tienes pedidos en curso.' } })));

    componente.iniciarBaja();
    componente.continuarBaja();
    componente.continuarBaja();

    expect(componente.errorBaja()).toBe('No puedes darte de baja porque tienes pedidos en curso.');
    expect(componente.bajaEnCurso()).toBe(false);
  });

  it('avisa al cliente de que los pedidos pagados o enviados impiden la baja', () => {
    crearComponente(of(perfilCliente));

    componente.iniciarBaja();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('con pedidos pagados o enviados la baja se rechazará');
  });

  it('muestra el rechazo de baja cuando el cliente tiene pedidos en curso', () => {
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');
    crearComponente(of(perfilCliente));
    perfilServiceMock.darDeBajaCuenta.mockReturnValue(throwError(() =>
      new HttpErrorResponse({
        status: 409,
        error: { error: 'No puedes darte de baja porque tienes pedidos en curso (pagados o enviados).' }
      })));

    componente.iniciarBaja();
    componente.continuarBaja();
    componente.continuarBaja();

    expect(perfilServiceMock.darDeBajaCuenta).toHaveBeenCalledWith('CLIENTE');
    expect(componente.errorBaja()).toBe('No puedes darte de baja porque tienes pedidos en curso (pagados o enviados).');
    expect(componente.bajaEnCurso()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('muestra la categoría del vendedor cuando está asociada', () => {
    crearComponente(of(perfilVendedor));

    expect(fixture.nativeElement.textContent).toContain('Tecnología');
    expect(fixture.nativeElement.textContent).not.toContain('No hay una categoría asociada');
  });

  it('muestra un mensaje cuando el vendedor no tiene categoría', () => {
    crearComponente(of({ ...perfilVendedor, categoria: null }));

    expect(fixture.nativeElement.textContent).toContain('No hay una categoría asociada');
  });

  it.each([
    'http://example.com/avatar.jpg',
    'javascript:alert(1)',
    'data:text/html,<h1>test</h1>'
  ])('rechaza una URL de perfil con protocolo no permitido: %s', (url) => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    componente.formulario.controls.imagenPerfil.setValue(url);

    expect(componente.formulario.controls.imagenPerfil.hasError('pattern')).toBe(true);
    componente.guardarCambios();
    expect(perfilServiceMock.modificarPerfil).not.toHaveBeenCalled();
  });

  it('acepta una URL HTTPS válida para la imagen de perfil', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    componente.formulario.controls.imagenPerfil.setValue('https://example.com/avatar.jpg');
    perfilServiceMock.modificarPerfil.mockReturnValue(of(perfilCliente));

    componente.guardarCambios();

    expect(componente.formulario.controls.imagenPerfil.valid).toBe(true);
    expect(perfilServiceMock.modificarPerfil).toHaveBeenCalled();
  });

  it('muestra el error devuelto por el backend', () => {
    crearComponente(throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(componente.cargando()).toBe(false);
    expect(componente.mensajeError()).toContain('No se pudo cargar el perfil');
  });

  it('redirige al login si la sesión ha caducado', () => {
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');
    crearComponente(throwError(() => new HttpErrorResponse({ status: 401 })));

    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
  });
  it('permite editar y guardar los campos autorizados de un cliente', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    componente.formulario.patchValue({
      nombre: 'Ana Nueva', apellidos: 'García López', telefono: '600123123',
      dniNif: '12345678A', fechaNacimiento: '2000-01-01', imagenPerfil: '',
    });
    const perfilActualizado = { ...perfilCliente, nombre: 'Ana Nueva' };
    perfilServiceMock.modificarPerfil.mockReturnValue(of(perfilActualizado));

    componente.guardarCambios();

    expect(perfilServiceMock.modificarPerfil).toHaveBeenCalledWith({
      nombre: 'Ana Nueva', apellidos: 'García López', telefono: '600123123',
      imagenPerfil: null, dniNif: '12345678A', fechaNacimiento: '2000-01-01',
    });
    expect(componente.perfil()).toEqual(perfilActualizado);
    expect(componente.mensajeExito()).toContain('actualizado');
    expect(componente.editando()).toBe(false);
  });

  it('conserva el teléfono enmascarado si el campo se deja vacío y permite borrarlo expresamente', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    expect(componente.formulario.controls.telefono.value).toBe('');

    componente.formulario.patchValue({ nombre: 'Ana', apellidos: 'García' });
    perfilServiceMock.modificarPerfil.mockReturnValue(of(perfilCliente));
    componente.guardarCambios();
    expect(perfilServiceMock.modificarPerfil).toHaveBeenLastCalledWith(expect.objectContaining({ telefono: null }));

    componente.iniciarEdicion();
    componente.formulario.patchValue({
      nombre: 'Ana',
      apellidos: 'García',
      eliminarTelefono: true
    });
    componente.guardarCambios();
    expect(perfilServiceMock.modificarPerfil).toHaveBeenLastCalledWith(expect.objectContaining({ telefono: '' }));
  });

  it('permite al vendedor seleccionar una categoría', () => {
    perfilServiceMock.obtenerCategorias.mockReturnValue(of([
      { id: 'cat-1', nombre: 'Tecnología' }, { id: 'cat-2', nombre: 'Hogar' },
    ]));
    crearComponente(of(perfilVendedor));
    componente.iniciarEdicion();
    componente.formulario.patchValue({ nombre: 'Luis', apellidos: 'Martín', categoriaId: 'cat-2' });
    const perfilActualizado = { ...perfilVendedor, categoria: 'Hogar', categoriaId: 'cat-2' };
    perfilServiceMock.modificarPerfil.mockReturnValue(of(perfilActualizado));

    componente.guardarCambios();

    expect(perfilServiceMock.modificarPerfil).toHaveBeenCalledWith(expect.objectContaining({ categoriaId: 'cat-2' }));
    expect(componente.perfil()).toEqual(perfilActualizado);
  });

  it('rechaza DNI y teléfono con formato incorrecto antes de enviar', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    componente.formulario.patchValue({ nombre: 'Ana', apellidos: 'García', telefono: 'telefono-invalido', dniNif: '123' });

    componente.guardarCambios();

    expect(perfilServiceMock.modificarPerfil).not.toHaveBeenCalled();
    expect(componente.mensajeFormulario()).toContain('Revisa');
  });

  it('no incluye contraseña ni direcciones en el formulario de edición', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();

    expect(fixture.nativeElement.querySelector('[formcontrolname="password"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="contrasena"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="direccion"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="direcciones"]')).toBeNull();
  });

  it('muestra el error del backend y mantiene el modo edición', () => {
    crearComponente(of(perfilCliente));
    componente.iniciarEdicion();
    componente.formulario.patchValue({ nombre: 'Ana', apellidos: 'García', telefono: '600123123', dniNif: '12345678A' });
    perfilServiceMock.modificarPerfil.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 400, error: { message: 'Datos inválidos' } })));

    componente.guardarCambios();

    expect(componente.mensajeFormulario()).toContain('Datos inválidos');
    expect(componente.guardando()).toBe(false);
    expect(componente.editando()).toBe(true);
  });

  it('pide confirmacion antes de cambiar a cliente premium', () => {
    const perfilNormal = { ...perfilCliente, esPremium: false };
    crearComponente(of(perfilNormal));
    const perfilActualizado = { ...perfilNormal, esPremium: true };
    perfilServiceMock.cambiarTipoCliente.mockReturnValue(of(perfilActualizado));

    componente.cambiarTipoCliente();
    expect(componente.mostrandoConfirmacionTipo()).toBe(true);
    componente.confirmarCambioTipoCliente();

    expect(pagosServiceMock.consultarMetodos).toHaveBeenCalled();
    expect(perfilServiceMock.cambiarTipoCliente).toHaveBeenCalledWith(true, 'mp-1');
    expect(componente.perfil()).toEqual(perfilActualizado);
    expect(componente.mensajeExito()).toContain('Ya eres cliente Premium');
  });

  it('no deja hacerse Premium sin elegir un método de pago (PBI 290)', () => {
    pagosServiceMock.consultarMetodos.mockReturnValue(of([]));
    crearComponente(of({ ...perfilCliente, esPremium: false }));

    componente.cambiarTipoCliente();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes ningún método de pago');

    componente.confirmarCambioTipoCliente();

    expect(perfilServiceMock.cambiarTipoCliente).not.toHaveBeenCalled();
    expect(componente.errorPagoPremium()).toContain('Selecciona un método de pago');
    expect(componente.mostrandoConfirmacionTipo()).toBe(true);
  });

  it('envía el método de pago elegido cuando el cliente tiene varios (PBI 290)', () => {
    pagosServiceMock.consultarMetodos.mockReturnValue(of([
      metodoPagoCliente, { ...metodoPagoCliente, id: 'mp-2', nombre: 'Otra tarjeta' },
    ]));
    crearComponente(of({ ...perfilCliente, esPremium: false }));
    perfilServiceMock.cambiarTipoCliente.mockReturnValue(of({ ...perfilCliente, esPremium: true }));

    componente.cambiarTipoCliente();
    expect(componente.metodoPagoSeleccionado()).toBe('');
    componente.metodoPagoSeleccionado.set('mp-2');
    componente.confirmarCambioTipoCliente();

    expect(perfilServiceMock.cambiarTipoCliente).toHaveBeenCalledWith(true, 'mp-2');
  });

  it('vuelve a mostrar el diálogo con el error si el backend rechaza el pago (PBI 290)', () => {
    crearComponente(of({ ...perfilCliente, esPremium: false }));
    perfilServiceMock.cambiarTipoCliente.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 400, error: { error: 'El método de pago está caducado.' } })));

    componente.cambiarTipoCliente();
    componente.confirmarCambioTipoCliente();

    expect(componente.perfil()?.esPremium).toBe(false);
    expect(componente.mostrandoConfirmacionTipo()).toBe(true);
    expect(componente.errorPagoPremium()).toBe('El método de pago está caducado.');
  });

  it('cancela el cambio de tipo si el cliente rechaza la confirmacion', () => {
    crearComponente(of({ ...perfilCliente, esPremium: false }));

    componente.cambiarTipoCliente();
    expect(componente.mostrandoConfirmacionTipo()).toBe(true);
    componente.cancelarCambioTipoCliente();

    expect(perfilServiceMock.modificarPerfil).not.toHaveBeenCalled();
    expect(perfilServiceMock.cambiarTipoCliente).not.toHaveBeenCalled();
    expect(componente.mostrandoConfirmacionTipo()).toBe(false);
  });

  it('confirma el cambio de premium a normal mediante el servicio especifico', () => {
    crearComponente(of(perfilCliente));
    const perfilActualizado = { ...perfilCliente, esPremium: false };
    perfilServiceMock.cambiarTipoCliente.mockReturnValue(of(perfilActualizado));

    componente.cambiarTipoCliente();
    componente.confirmarCambioTipoCliente();

    expect(perfilServiceMock.cambiarTipoCliente).toHaveBeenCalledWith(false, null);
    expect(pagosServiceMock.consultarMetodos).not.toHaveBeenCalled();
    expect(componente.perfil()).toEqual(perfilActualizado);
  });

  it('muestra el error y conserva el tipo anterior si falla el cambio', () => {
    crearComponente(of({ ...perfilCliente, esPremium: false }));
    perfilServiceMock.cambiarTipoCliente.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 400, error: { message: 'No se pudo actualizar' } })));

    componente.cambiarTipoCliente();
    componente.confirmarCambioTipoCliente();

    expect(componente.perfil()?.esPremium).toBe(false);
    expect(componente.mensajeFormulario()).toContain('No se pudo actualizar');
    expect(componente.guardando()).toBe(false);
  });

  it('activa TOTP con un código que empieza por cero y muestra los códigos de respaldo', () => {
    crearComponente(of(perfilCliente));
    componente.configuracionTOTP.set({ otpauthUri: 'otpauth://totp/ESIBuy', qrDataUrl: null });
    componente.codigoTOTP.set('081804');
    const backupCodes = ['ABCDEFG2', '234567AB'];
    perfilServiceMock.confirmarSegundoFactor.mockReturnValue(of({ enabled: true, backupCodes }));

    componente.confirmarTOTP();
    fixture.detectChanges();

    expect(perfilServiceMock.confirmarSegundoFactor).toHaveBeenCalledWith('081804');
    expect(componente.perfil()?.totpActivado).toBe(true);
    expect(componente.codigosRespaldo()).toEqual(backupCodes);
    expect(componente.configuracionTOTP()).toBeNull();
    expect(componente.cargandoTOTP()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('ABCDEFG2');
  });

  it.each([
    { status: 500, error: undefined, mensaje: 'No se pudo activar el segundo factor.' },
    { status: 500, error: { error: 'Internal Server Error' }, mensaje: 'No se pudo activar el segundo factor.' },
    { status: 0, error: undefined, mensaje: 'No se pudo conectar con el servicio.' },
    { status: 401, error: undefined, mensaje: 'Tu sesión ya no es válida.' },
    { status: 400, error: { error: 'No hay una configuración TOTP pendiente. Genera un QR nuevo.' },
      mensaje: 'No hay una configuración TOTP pendiente. Genera un QR nuevo.' },
    { status: 400, error: { error: 'El código TOTP no es válido.' }, mensaje: 'El código TOTP no es válido.' },
  ])('muestra el motivo real al fallar la confirmación ($status, $mensaje)', ({ status, error, mensaje }) => {
    crearComponente(of(perfilCliente));
    const configuracion = { otpauthUri: 'otpauth://totp/ESIBuy', qrDataUrl: null };
    componente.configuracionTOTP.set(configuracion);
    componente.codigoTOTP.set('081804');
    perfilServiceMock.confirmarSegundoFactor.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status, error })));

    componente.confirmarTOTP();
    fixture.detectChanges();

    expect(componente.errorTOTP()).toContain(mensaje);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(mensaje);
    expect(componente.perfil()?.totpActivado).toBe(false);
    expect(componente.configuracionTOTP()).toEqual(configuracion);
    expect(componente.cargandoTOTP()).toBe(false);
  });
  describe('jerarquía y datos legibles (A5, M13, B9)', () => {
    it('muestra la fecha de nacimiento como dd/MM/aaaa', () => {
      crearComponente(of({ ...perfilCliente, fechaNacimiento: '2003-11-20' }));

      expect(fixture.nativeElement.textContent).toContain('20/11/2003');
      expect(fixture.nativeElement.textContent).not.toContain('2003-11-20');
    });

    it('pone en mayúscula la inicial del avatar', () => {
      crearComponente(of({ ...perfilAdministrador, nombre: 'ada' }));

      expect(fixture.nativeElement.querySelector('.profile-placeholder').textContent.trim()).toBe('A');
    });

    it('oculta los datos del administrador que no tienen valor', () => {
      crearComponente(of({ ...perfilAdministrador, sede: null, fechaIncorporacion: null }));

      const texto = fixture.nativeElement.textContent;
      expect(texto).not.toContain('No disponible');
      expect(texto).not.toContain('Fecha de incorporación');
    });

    it('formatea la fecha de incorporación del administrador', () => {
      crearComponente(of(perfilAdministrador));

      expect(fixture.nativeElement.textContent).toContain('01/01/2026');
    });

    it('deja una sola acción en la cabecera y lleva direcciones y pagos junto a los datos', () => {
      crearComponente(of(perfilCliente));

      const cabecera = fixture.nativeElement.querySelector('.pagina-cabecera');
      expect(cabecera.querySelectorAll('a, button').length).toBe(1);
      expect(cabecera.textContent).toContain('Editar perfil');
      const enlaces = fixture.nativeElement.querySelector('.profile-links');
      expect(enlaces.textContent).toContain('Mis direcciones');
      expect(enlaces.textContent).toContain('Mis métodos de pago');
    });

    it('oculta la ficha de lectura mientras se edita', () => {
      crearComponente(of(perfilCliente));

      componente.iniciarEdicion();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.profile-data')).toBeNull();
      expect(fixture.nativeElement.querySelector('.edit-form')).not.toBeNull();
    });

    it('explica el DNI con una ayuda bajo el campo, no con un placeholder', () => {
      crearComponente(of(perfilCliente));

      componente.iniciarEdicion();
      fixture.detectChanges();

      const dni = fixture.nativeElement.querySelector('[formcontrolname="dniNif"]') as HTMLInputElement;
      expect(dni.getAttribute('placeholder')).toBeNull();
      expect(fixture.nativeElement.querySelector('#' + dni.getAttribute('aria-describedby')).textContent)
        .toContain('Déjalo vacío para conservar el actual');
    });
  });
  it('solo ofrece correo a clientes con TOTP y evita duplicados', () => {
    crearComponente(of(perfilCliente));
    const checkbox = fixture.nativeElement.querySelector('#tercer-factor-titulo')
      .closest('section').querySelector('input');
    expect(checkbox.disabled).toBe(true);
    componente.cambiarEmailOtp(true);
    expect(perfilServiceMock.modificarPreferenciaTercerFactor).not.toHaveBeenCalled();
    componente.perfil.set({ ...perfilCliente, totpActivado: true });
    const pendiente = new Subject<void>();
    perfilServiceMock.modificarPreferenciaTercerFactor.mockReturnValue(pendiente);
    componente.cambiarEmailOtp(true);
    componente.cambiarEmailOtp(true);
    expect(perfilServiceMock.modificarPreferenciaTercerFactor).toHaveBeenCalledTimes(1);
    expect(componente.guardandoEmailOtp()).toBe(true);
    pendiente.next();
    pendiente.complete();
    expect(componente.perfil()?.emailOtpActivado).toBe(true);
    expect(componente.guardandoEmailOtp()).toBe(false);
  });

  it('restaura el checkbox si el servidor rechaza la activación', () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true }));
    perfilServiceMock.modificarPreferenciaTercerFactor.mockReturnValue(throwError(() => new Error('fallo')));
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('#tercer-factor-titulo')
      .closest('section').querySelector('input');
    checkbox.click();
    fixture.detectChanges();
    expect(checkbox.checked).toBe(false);
    expect(componente.perfil()?.emailOtpActivado).toBe(false);
  });

  it('desactiva correo y conserva la preferencia ante error', () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true, emailOtpActivado: true }));
    perfilServiceMock.modificarPreferenciaTercerFactor.mockReturnValue(throwError(() => new Error('fallo')));
    componente.cambiarEmailOtp(false);
    expect(componente.perfil()?.emailOtpActivado).toBe(true);
    expect(componente.errorEmailOtp()).not.toBe('');
    perfilServiceMock.modificarPreferenciaTercerFactor.mockReturnValue(of(undefined));
    componente.cambiarEmailOtp(false);
    expect(componente.perfil()?.emailOtpActivado).toBe(false);
  });

  it('no desactiva TOTP mientras correo esté activo', async () => {
    crearComponente(of({ ...perfilCliente, totpActivado: true, emailOtpActivado: true }));
    expect(fixture.nativeElement.querySelector('#totp-disable-code')).toBeNull();
    await componente.desactivarTOTP();
    expect(perfilServiceMock.desactivarSegundoFactor).not.toHaveBeenCalled();
    expect(componente.errorTOTP()).toContain('Desactiva primero');
  });

  it.each([perfilVendedor, perfilAdministrador])('no ofrece cambiar correo a $tipoUsuario', datos => {
    crearComponente(of(datos));
    expect(fixture.nativeElement.querySelector('#tercer-factor-titulo')).toBeNull();
    componente.cambiarEmailOtp(false);
    expect(perfilServiceMock.modificarPreferenciaTercerFactor).not.toHaveBeenCalled();
  });

  describe('descarga de los datos personales (T-25)', () => {
    function simularDescarga() {
      const crear = vi.fn(() => 'blob:datos');
      const revocar = vi.fn();
      Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar });
      const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      return { crear, revocar, clic };
    }

    it('ofrece la descarga a todos los tipos de usuario', () => {
      for (const perfil of [perfilCliente, perfilVendedor, perfilAdministrador]) {
        crearComponente(of(perfil));
        expect(fixture.nativeElement.textContent).toContain('Descargar mis datos');
        fixture.destroy();
      }
    });

    it('descarga el JSON con un enlace temporal y lo libera', () => {
      const { crear, revocar, clic } = simularDescarga();
      perfilServiceMock.descargarMisDatos.mockReturnValue(of(new Blob(['{}'], { type: 'application/json' })));
      crearComponente(of(perfilCliente));

      componente.descargarMisDatos();

      expect(perfilServiceMock.descargarMisDatos).toHaveBeenCalledTimes(1);
      expect(crear).toHaveBeenCalledTimes(1);
      expect(clic).toHaveBeenCalledTimes(1);
      expect(revocar).toHaveBeenCalledWith('blob:datos');
      expect(componente.descargaEnCurso()).toBe(false);
      expect(componente.errorDescarga()).toBe('');
    });

    it('explica el límite de una descarga por minuto cuando el servidor responde 429', () => {
      simularDescarga();
      perfilServiceMock.descargarMisDatos.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429 })));
      crearComponente(of(perfilCliente));

      componente.descargarMisDatos();
      fixture.detectChanges();

      expect(componente.errorDescarga()).toContain('una vez por minuto');
      expect(fixture.nativeElement.textContent).toContain('una vez por minuto');
    });

    it('vuelve al inicio de sesión si la sesión ha caducado', () => {
      simularDescarga();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      perfilServiceMock.descargarMisDatos.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })));
      crearComponente(of(perfilCliente));

      componente.descargarMisDatos();

      expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
    });

    it('no lanza una segunda descarga mientras hay una en curso', () => {
      simularDescarga();
      perfilServiceMock.descargarMisDatos.mockReturnValue(new Subject<Blob>());
      crearComponente(of(perfilCliente));

      componente.descargarMisDatos();
      componente.descargarMisDatos();

      expect(perfilServiceMock.descargarMisDatos).toHaveBeenCalledTimes(1);
    });
  });
});
