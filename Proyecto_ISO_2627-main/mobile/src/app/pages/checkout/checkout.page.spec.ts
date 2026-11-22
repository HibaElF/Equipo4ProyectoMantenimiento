import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Carrito } from '../../core/models/carrito';
import { CarritoService } from '../../core/services/carrito.service';
import { CheckoutService } from '../../core/services/checkout.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { PagosService } from '../../core/services/pagos.service';
import { CheckoutPage } from './checkout.page';

const carrito: Carrito = {
  productos: [
    { productoId: 'p1', cantidad: 1, precioUnitario: 10, subtotal: 10, nombre: 'A', imagen: null, stock: 5, disponible: true, aviso: null, vendedor: 'V1' }
  ],
  importe: 10
};
const direccion = { id: 'd1', nombre: 'Casa', calle: 'Mayor', numero: '3', codigoPostal: '13001', ciudad: 'CR', provincia: 'CR' };
const metodo = { id: 'm1', tipo: 'TARJETA', nombre: 'Visa', datosEnmascarados: '****4242' };

describe('CheckoutPage', () => {
  const pagar = vi.fn();

  function crear(direcciones = [direccion], metodos = [metodo]) {
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: AuthService, useValue: { obtenerSesionActual: () => of({ email: 'c@x.es', role: 'CLIENTE' }) } },
        { provide: CarritoService, useValue: { consultar: () => of(carrito) } },
        { provide: DireccionesService, useValue: { consultar: () => of(direcciones) } },
        { provide: PagosService, useValue: { consultarMetodos: () => of(metodos) } }
      ]
    });
    TestBed.overrideProvider(CheckoutService, {
      useFactory: () => {
        const real = new CheckoutService();
        real.pagar = pagar;
        return real;
      }
    });
    return TestBed.createComponent(CheckoutPage).componentInstance;
  }

  beforeEach(() => {
    sessionStorage.clear();
    pagar.mockReset();
  });

  it('explica qué falta para poder pagar', () => {
    const pagina = crear([direccion, { ...direccion, id: 'd2' }], [metodo, { ...metodo, id: 'm2' }]);
    expect(pagina.puedePagar()).toBe(false);
    expect(pagina.motivoPagoDesactivado()).toBe('Elige una dirección de envío y un método de pago.');
    pagina.direccionId.set('d1');
    expect(pagina.motivoPagoDesactivado()).toBe('Elige un método de pago.');
  });

  it('elige automáticamente la única dirección y el único método', () => {
    const pagina = crear();
    expect(pagina.direccionId()).toBe('d1');
    expect(pagina.metodoPagoId()).toBe('m1');
    expect(pagina.puedePagar()).toBe(true);
  });

  it('si no se confirma el pago, reintenta con el mismo identificador (no cobra dos veces)', () => {
    pagar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    const pagina = crear();
    pagina.pagar();
    const primero = pagar.mock.calls[0][0].operacionId;
    expect(pagina.pendiente()).not.toBeNull();
    expect(pagina.error()).toContain('Comprueba el resultado');

    pagar.mockReturnValueOnce(of({ pedidos: [], importeTotal: 10 }));
    pagina.pagar();
    expect(pagar.mock.calls[1][0].operacionId).toBe(primero);
    expect(pagina.compra()).not.toBeNull();
    expect(pagina.pendiente()).toBeNull();
  });

  it('si el backend rechaza el pago, olvida la operación pendiente', () => {
    pagar.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'El carrito está vacío.' } }))
    );
    const pagina = crear();
    pagina.pagar();
    expect(pagina.pendiente()).toBeNull();
    expect(pagina.error()).toBe('El carrito está vacío.');
  });
});
