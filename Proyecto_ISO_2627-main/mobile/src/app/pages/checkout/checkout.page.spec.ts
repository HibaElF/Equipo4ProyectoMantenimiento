import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Carrito } from '../../core/models/carrito';
import { CarritoService } from '../../core/services/carrito.service';
import { CheckoutService } from '../../core/services/checkout.service';
import { DireccionesService } from '../../core/services/direcciones.service';
import { PagosService } from '../../core/services/pagos.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
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

describe('CheckoutPage: compra correcta, añadir sin salir y sesión', () => {
  const pagar = vi.fn();
  const sesion = vi.fn();

  function crear(direcciones: unknown[] = [direccion], metodos: unknown[] = [metodo]) {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: AuthService, useValue: { obtenerSesionActual: sesion } },
        { provide: CarritoService, useValue: { consultar: () => of(carrito) } },
        { provide: DireccionesService, useValue: { consultar: () => of(direcciones) } },
        { provide: PagosService, useValue: { consultarMetodos: () => of(metodos) } },
        ...falsos.providers
      ]
    });
    TestBed.overrideProvider(CheckoutService, {
      useFactory: () => {
        const real = new CheckoutService();
        real.pagar = pagar;
        return real;
      }
    });
    const nav = TestBed.inject(NavController);
    const atras = vi.spyOn(nav, 'navigateBack').mockResolvedValue(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const pagina = TestBed.createComponent(CheckoutPage).componentInstance;
    return { pagina, atras, navegar, ...falsos };
  }

  beforeEach(() => {
    sessionStorage.clear();
    pagar.mockReset();
    sesion.mockReset().mockReturnValue(of({ email: 'c@x.es', role: 'CLIENTE' }));
  });

  it('compra correcta: muestra la confirmación y olvida la operación', () => {
    const compra = { pedidos: [{ id: 'x', direccionEnvio: direccion }], importeTotal: 10 };
    pagar.mockReturnValue(of(compra));
    const { pagina, navegar, atras } = crear();
    pagina.pagar();
    expect(pagina.compra()).toEqual(compra);
    expect(sessionStorage.length).toBe(0);
    expect(pagina.direccionDe(compra as never)).toEqual(direccion);
    pagina.irAPedidos();
    expect(navegar).toHaveBeenCalledWith('/pedidos', { replaceUrl: true });
    // Al volver a la pestaña Carrito después de comprar, se vuelve al carrito.
    pagina.ionViewWillEnter();
    expect(atras).toHaveBeenCalledWith('/carrito');
  });

  it('añade una dirección y un método sin salir de la compra y los deja elegidos', async () => {
    const { pagina, modales } = crear([], []);
    const nueva = { ...direccion, id: 'd2' };
    modales.rolAlCerrar = 'guardado';
    modales.datosAlCerrar = nueva;
    await pagina.anadirDireccion();
    expect(pagina.direcciones()).toContainEqual(nueva);
    expect(pagina.direccionId()).toBe('d2');

    const nuevo = { ...metodo, id: 'm2' };
    modales.datosAlCerrar = nuevo;
    await pagina.anadirMetodo();
    expect(pagina.metodoPagoId()).toBe('m2');

    modales.rolAlCerrar = 'cancel';
    await pagina.anadirMetodo();
    expect(pagina.metodos().length).toBe(1);
  });

  it('solo los clientes pueden comprar', () => {
    sesion.mockReturnValue(of({ email: 'v@x.es', role: 'VENDEDOR' }));
    expect(crear().pagina.error()).toBe('Solo los clientes pueden realizar compras.');
  });

  it('sin sesión muestra el error', () => {
    sesion.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    expect(crear().pagina.error()).toBe('Tu sesión ha caducado. Inicia sesión de nuevo para continuar.');
  });

  it('si la operación guardada está dañada no deja seguir', () => {
    sessionStorage.setItem('esibuy.checkout.c@x.es', JSON.stringify({ direccionId: 'd1' }));
    expect(crear().pagina.error()).toBe('No se pudo recuperar la compra pendiente en este dispositivo. Inténtalo de nuevo.');
  });
});
