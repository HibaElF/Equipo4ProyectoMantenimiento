import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { PagosService } from '../../core/services/pagos.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { FormularioMetodoPagoComponent } from './formulario-metodo-pago.component';

describe('FormularioMetodoPagoComponent', () => {
  const api = { consultarTipos: vi.fn(), registrar: vi.fn() };

  function crear() {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [FormularioMetodoPagoComponent],
      providers: [provideIonicAngular({}), { provide: PagosService, useValue: api }, ...falsos.providers]
    });
    const c = TestBed.createComponent(FormularioMetodoPagoComponent).componentInstance;
    c.ngOnInit();
    return { c, modales: falsos.modales };
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.consultarTipos.mockReturnValue(of([{ codigo: 'TARJETA', nombre: 'Tarjeta' }, { codigo: 'BIZUM', nombre: 'Bizum' }]));
  });

  it('empieza con el primer tipo y, si no se cargan los tipos, usa los de siempre', () => {
    expect(crear().c.tipo()).toBe('TARJETA');
    TestBed.resetTestingModule();
    api.consultarTipos.mockReturnValue(throwError(() => new Error('x')));
    const { c } = crear();
    expect(c.tipo()).toBe('TARJETA');
    expect(c.tiposVisibles().map((t) => t.codigo)).toEqual(['TARJETA', 'PAYPAL', 'BIZUM']);
  });

  it('da formato al número y a la caducidad mientras se escriben', () => {
    const { c } = crear();
    c.escribirNumero('4242424242424242');
    expect(c.form.controls.numeroTarjeta.value).toBe('4242 4242 4242 4242');
    c.escribirCaducidad('1230');
    expect(c.form.controls.caducidad.value).toBe('12/30');
  });

  it('tarjeta: valida y envía solo sus campos, sin espacios en el número', () => {
    api.registrar.mockReturnValue(of({ id: 'm1' }));
    const { c, modales } = crear();
    c.guardar();
    expect(api.registrar).not.toHaveBeenCalled();
    expect(c.errorDe('nombre')).toBe('Ponle un nombre para reconocerlo.');

    c.form.patchValue({ nombre: ' Visa ', titular: 'Ana Ruiz', cvv: '123', telefonoBizum: '600000000' });
    c.escribirNumero('4242424242424242');
    c.escribirCaducidad('1230');
    c.guardar();
    expect(api.registrar).toHaveBeenCalledWith({
      tipo: 'TARJETA', nombre: 'Visa', numeroTarjeta: '4242424242424242', titular: 'Ana Ruiz', caducidad: '12/30', cvv: '123',
      correoPaypal: null, telefonoBizum: null
    });
    expect(modales.dismiss).toHaveBeenCalledWith({ id: 'm1' }, 'guardado');
  });

  it('al cambiar a Bizum ya no exige los datos de la tarjeta', () => {
    api.registrar.mockReturnValue(of({ id: 'm2' }));
    const { c } = crear();
    c.cambiarTipo('BIZUM');
    c.form.patchValue({ nombre: 'Bizum', telefonoBizum: '612345678' });
    c.guardar();
    expect(api.registrar.mock.calls[0][0]).toMatchObject({ tipo: 'BIZUM', numeroTarjeta: null, telefonoBizum: '612345678' });
  });

  it('marca en cada campo los errores que devuelve el servidor', () => {
    api.registrar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { errores: { telefonoBizum: ['El teléfono no es válido.'] } } }))
    );
    const { c } = crear();
    c.cambiarTipo('BIZUM');
    c.form.patchValue({ nombre: 'Bizum', telefonoBizum: '612345678' });
    c.guardar();
    expect(c.error()).toBe('El teléfono no es válido.');
    expect(c.errorDe('telefonoBizum')).toBe('El teléfono no es válido.');
  });

  it('errores generales: sin conexión y sin permiso', () => {
    const { c } = crear();
    c.cambiarTipo('BIZUM');
    c.form.patchValue({ nombre: 'Bizum', telefonoBizum: '612345678' });
    api.registrar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    c.guardar();
    expect(c.error()).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    api.registrar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    c.guardar();
    expect(c.error()).toBe('No tienes permiso para registrar métodos de pago.');
  });

  it('cerrar sin guardar', () => {
    const { c, modales } = crear();
    c.cerrar();
    expect(modales.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
