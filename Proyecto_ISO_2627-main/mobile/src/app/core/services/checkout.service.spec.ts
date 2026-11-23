import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CarritoEstadoService } from './carrito-estado.service';
import { CheckoutService, mensajeErrorCheckout } from './checkout.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('CheckoutService', () => {
  const auth = { peticionConCsrf: vi.fn() };
  const estado = { refrescar: vi.fn() };
  let servicio: CheckoutService;

  beforeEach(() => {
    Object.values(auth).forEach((f) => f.mockReset());
    estado.refrescar.mockReset();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }, { provide: CarritoEstadoService, useValue: estado }]
    });
    servicio = TestBed.inject(CheckoutService);
  });

  it('paga con el identificador de operación y actualiza el contador del carrito', () => {
    auth.peticionConCsrf.mockReturnValue(of({ pedidos: [], importeTotal: 10 }));
    const req = { direccionId: 'd1', metodoPagoId: 'm1', operacionId: 'op' };
    servicio.pagar(req).subscribe();
    expect(auth.peticionConCsrf).toHaveBeenCalledWith('POST', '/cliente/pedidos', req);
    expect(estado.refrescar).toHaveBeenCalled();
  });

  it('genera identificadores UUID v4 distintos, también sin randomUUID', () => {
    const a = servicio.nuevoIdentificador();
    expect(a).toMatch(UUID);
    expect(servicio.nuevoIdentificador()).not.toBe(a);
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(servicio.nuevoIdentificador()).toMatch(UUID);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });

  it('recuerda la operación pendiente por usuario (para no cobrar dos veces)', () => {
    const req = { direccionId: 'd1', metodoPagoId: 'm1', operacionId: servicio.nuevoIdentificador() };
    servicio.guardarOperacion(' Ana@X.es ', req);
    expect(servicio.obtenerOperacion('ana@x.es')).toEqual(req);
    expect(servicio.obtenerOperacion('otro@x.es')).toBeNull();
    servicio.limpiarOperacion('ana@x.es');
    expect(servicio.obtenerOperacion('ana@x.es')).toBeNull();
  });

  it('rechaza una operación guardada manipulada', () => {
    sessionStorage.setItem('esibuy.checkout.ana@x.es', JSON.stringify({ direccionId: 'd1', metodoPagoId: '', operacionId: 'x' }));
    expect(() => servicio.obtenerOperacion('ana@x.es')).toThrow('No se pudo recuperar la operación pendiente.');
  });
});

describe('mensajeErrorCheckout', () => {
  const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

  it('mismos mensajes que la web', () => {
    expect(mensajeErrorCheckout(err(400, { error: 'Sin stock.' }), 'x', false)).toBe('Sin stock.');
    expect(mensajeErrorCheckout(err(409), 'x', false)).toBe('La compra ha cambiado o se está procesando. Comprueba de nuevo el resultado.');
    expect(mensajeErrorCheckout(err(0), 'x', true)).toBe(
      'No hemos podido confirmar el resultado del pago. Comprueba el resultado para evitar otra compra.'
    );
    expect(mensajeErrorCheckout(err(503), 'x', true)).toContain('Comprueba el resultado');
    expect(mensajeErrorCheckout(err(0), 'x', false)).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    expect(mensajeErrorCheckout(err(401), 'x', false)).toBe('Tu sesión ha caducado. Inicia sesión de nuevo para continuar.');
    expect(mensajeErrorCheckout(err(403), 'x', false)).toContain('No tienes permiso');
    expect(mensajeErrorCheckout(err(500), 'Por defecto', false)).toBe('Por defecto');
  });
});
