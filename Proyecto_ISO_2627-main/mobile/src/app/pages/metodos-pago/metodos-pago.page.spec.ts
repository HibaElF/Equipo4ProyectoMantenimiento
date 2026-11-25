import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { PagosService } from '../../core/services/pagos.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { MetodosPagoPage } from './metodos-pago.page';

const visa = { id: 'm1', tipo: 'TARJETA', nombre: 'Visa', datosEnmascarados: '•••• 4242' };

describe('MetodosPagoPage', () => {
  const api = { consultarTipos: vi.fn(), consultarMetodos: vi.fn(), eliminar: vi.fn() };

  function crear() {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [MetodosPagoPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PagosService, useValue: api }, ...falsos.providers]
    });
    const pagina = TestBed.createComponent(MetodosPagoPage).componentInstance;
    return { pagina, ...falsos };
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.consultarTipos.mockReturnValue(of([{ codigo: 'TARJETA', nombre: 'Tarjeta bancaria' }]));
    api.consultarMetodos.mockReturnValue(of([visa]));
  });

  it('carga los métodos y nombra los tipos como la web', () => {
    const { pagina } = crear();
    expect(pagina.metodos()).toEqual([visa]);
    expect(pagina.nombreTipo('TARJETA')).toBe('Tarjeta bancaria');
    expect(pagina.nombreTipo('BIZUM')).toBe('Bizum');
  });

  it('icono según el tipo', () => {
    const { pagina } = crear();
    expect(pagina.icono('PAYPAL')).toBe('logo-paypal');
    expect(pagina.icono('BIZUM')).toBe('phone-portrait-outline');
    expect(pagina.icono('TARJETA')).toBe('card-outline');
  });

  it('errores de carga: sin conexión y otros', () => {
    api.consultarMetodos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(crear().pagina.error()).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    TestBed.resetTestingModule();
    api.consultarMetodos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(crear().pagina.error()).toBe('No se pudieron cargar tus métodos de pago.');
  });

  it('al registrar uno recarga la lista', async () => {
    const { pagina, modales, toasts } = crear();
    modales.rolAlCerrar = 'guardado';
    await pagina.abrirFormulario();
    expect(api.consultarMetodos).toHaveBeenCalledTimes(2);
    expect(toasts.mensajes).toContain('Método de pago registrado correctamente.');
  });

  it('eliminar pide confirmación; si falla muestra el mensaje del servidor', async () => {
    const { pagina, alertas, toasts } = crear();
    api.eliminar.mockReturnValue(of(undefined));
    await pagina.confirmarEliminar(visa);
    alertas.pulsar('Eliminar');
    expect(api.eliminar).toHaveBeenCalledWith('m1');
    expect(api.consultarMetodos).toHaveBeenCalledTimes(2);

    api.eliminar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Está en un pedido en curso.' } })));
    await pagina.confirmarEliminar(visa);
    alertas.pulsar('Eliminar');
    await Promise.resolve();
    expect(toasts.mensajes.at(-1)).toBe('Está en un pedido en curso.');
  });
});
