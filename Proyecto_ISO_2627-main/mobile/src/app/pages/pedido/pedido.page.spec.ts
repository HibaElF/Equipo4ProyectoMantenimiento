import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { EstadoPedido, PedidoCliente } from '../../core/models/pedido';
import { PedidosService } from '../../core/services/pedidos.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { PedidoPage } from './pedido.page';

function pedido(estado: EstadoPedido, recorridos: EstadoPedido[]): PedidoCliente {
  return {
    id: 'abcdef123456',
    lineas: [
      { productoId: 'p1', nombreProducto: 'A', precioCompra: 10, cantidad: 1, vendedorId: 'v', nombreVendedor: 'V' },
      { productoId: 'p2', nombreProducto: 'B', precioCompra: 5, cantidad: 2, vendedorId: 'v', nombreVendedor: 'V' }
    ],
    estado,
    importe: 20,
    fechaCreacion: '2026-11-01T10:00:00',
    fechaPago: '2026-11-01T10:01:00',
    direccionEnvio: null,
    historialEstados: recorridos.map((e) => ({ estado: e, fecha: '2026-11-01T10:00:00' }))
  };
}

describe('PedidoPage', () => {
  const api = {
    consultarDetalle: vi.fn(),
    consultarEstadoValoracion: vi.fn(),
    valorarProducto: vi.fn(),
    cancelar: vi.fn(),
    confirmarRecepcion: vi.fn()
  };

  function crear(p: PedidoCliente) {
    api.consultarDetalle.mockReturnValue(of(p));
    TestBed.configureTestingModule({
      imports: [PedidoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PedidosService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: p.id }) } } }
      ]
    });
    return TestBed.createComponent(PedidoPage).componentInstance;
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('muestra todo el recorrido y solo permite cancelar mientras no se ha enviado', () => {
    const pagina = crear(pedido('PAGADO_COMPLETADO', ['EN_PROCESO', 'PAGADO_COMPLETADO']));
    expect(pagina.pasos()).toEqual(['EN_PROCESO', 'PAGADO_COMPLETADO', 'TRAMITADO_ENVIADO', 'FINALIZADO']);
    expect(pagina.puedeCancelar()).toBe(true);
    expect(pagina.puedeConfirmar()).toBe(false);
  });

  it('en un pedido cancelado muestra solo los pasos alcanzados y «Cancelado»', () => {
    const pagina = crear(pedido('CANCELADO', ['EN_PROCESO', 'PAGADO_COMPLETADO', 'CANCELADO']));
    expect(pagina.pasos()).toEqual(['EN_PROCESO', 'PAGADO_COMPLETADO', 'CANCELADO']);
    expect(pagina.puedeCancelar()).toBe(false);
  });

  it('un pedido enviado permite confirmar la recepción', () => {
    const pagina = crear(pedido('TRAMITADO_ENVIADO', ['EN_PROCESO', 'PAGADO_COMPLETADO', 'TRAMITADO_ENVIADO']));
    expect(pagina.puedeConfirmar()).toBe(true);
    expect(pagina.puedeCancelar()).toBe(false);
  });

  it('si está finalizado comprueba qué productos se pueden valorar', () => {
    api.consultarEstadoValoracion.mockImplementation((_: string, productoId: string) => of({ valorada: productoId === 'p2' }));
    const pagina = crear(pedido('FINALIZADO', ['EN_PROCESO', 'PAGADO_COMPLETADO', 'TRAMITADO_ENVIADO', 'FINALIZADO']));
    expect(pagina.estadoValoracion('p1')?.estado).toBe('pendiente');
    expect(pagina.estadoValoracion('p2')?.estado).toBe('valorada');
  });

  it('no consulta valoraciones si el pedido no está finalizado', () => {
    crear(pedido('PAGADO_COMPLETADO', ['EN_PROCESO', 'PAGADO_COMPLETADO']));
    expect(api.consultarEstadoValoracion).not.toHaveBeenCalled();
  });

  it('envía la puntuación y el comentario y marca el producto como valorado', () => {
    api.consultarEstadoValoracion.mockReturnValue(of({ valorada: false }));
    api.valorarProducto.mockReturnValue(of({}));
    const p = pedido('FINALIZADO', ['FINALIZADO']);
    const pagina = crear(p);
    pagina.abrirValoracion(p.lineas[0]);
    pagina.puntuacion.set(4);
    pagina.comentario = '  Muy bien  ';
    pagina.enviarValoracion();
    expect(api.valorarProducto).toHaveBeenCalledWith(p.id, 'p1', { puntuacion: 4, comentario: 'Muy bien' });
    expect(pagina.estadoValoracion('p1')?.estado).toBe('valorada');
    expect(pagina.productoAValorar()).toBeNull();
  });

  it('si el producto ya estaba valorado (409) lo indica y no deja repetir', () => {
    api.consultarEstadoValoracion.mockReturnValue(of({ valorada: false }));
    api.valorarProducto.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const p = pedido('FINALIZADO', ['FINALIZADO']);
    const pagina = crear(p);
    pagina.abrirValoracion(p.lineas[0]);
    pagina.enviarValoracion();
    expect(pagina.errorValoracion()).toBe('Este producto ya está valorado.');
    expect(pagina.estadoValoracion('p1')?.estado).toBe('valorada');
  });

  it('rechaza comentarios de más de 500 caracteres sin llamar al servidor', () => {
    api.consultarEstadoValoracion.mockReturnValue(of({ valorada: false }));
    const p = pedido('FINALIZADO', ['FINALIZADO']);
    const pagina = crear(p);
    pagina.abrirValoracion(p.lineas[0]);
    pagina.comentario = 'x'.repeat(501);
    pagina.enviarValoracion();
    expect(pagina.errorValoracion()).toBe('El comentario no puede superar los 500 caracteres.');
    expect(api.valorarProducto).not.toHaveBeenCalled();
  });

  it('muestra un error si el pedido no existe', () => {
    api.consultarDetalle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    TestBed.configureTestingModule({
      imports: [PedidoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PedidosService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'x' }) } } }
      ]
    });
    const pagina = TestBed.createComponent(PedidoPage).componentInstance;
    expect(pagina.error()).toBe('El pedido no existe o no está disponible.');
  });
});

describe('PedidoPage: cancelar y confirmar recepción', () => {
  const api = { consultarDetalle: vi.fn(), consultarEstadoValoracion: vi.fn(), cancelar: vi.fn(), confirmarRecepcion: vi.fn() };

  function crear(p: PedidoCliente) {
    const falsos = controladoresFalsos();
    api.consultarDetalle.mockReturnValue(of(p));
    TestBed.configureTestingModule({
      imports: [PedidoPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PedidosService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: p.id }) } } },
        ...falsos.providers
      ]
    });
    return { pagina: TestBed.createComponent(PedidoPage).componentInstance, ...falsos };
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('cancelar pide confirmación con la referencia y actualiza el pedido', async () => {
    const cancelado = pedido('CANCELADO', ['EN_PROCESO', 'CANCELADO']);
    api.cancelar.mockReturnValue(of(cancelado));
    const { pagina, alertas, toasts } = crear(pedido('EN_PROCESO', ['EN_PROCESO']));
    await pagina.confirmarCancelacion();
    expect(alertas.creadas[0].message).toBe('¿Quieres cancelar el pedido #123456?');
    expect(api.cancelar).not.toHaveBeenCalled();
    alertas.pulsar('Cancelar pedido');
    expect(api.cancelar).toHaveBeenCalledWith('abcdef123456');
    expect(pagina.pedido()?.estado).toBe('CANCELADO');
    await Promise.resolve();
    expect(toasts.mensajes.length).toBe(1);
  });

  it('si no se puede cancelar lo avisa', async () => {
    api.cancelar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Ya se ha enviado.' } })));
    const { pagina, alertas, toasts } = crear(pedido('PAGADO_COMPLETADO', ['PAGADO_COMPLETADO']));
    await pagina.confirmarCancelacion();
    alertas.pulsar('Cancelar pedido');
    await Promise.resolve();
    expect(toasts.mensajes[0]).toBe('Ya se ha enviado.');
    expect(pagina.operando()).toBeNull();
  });

  it('confirmar la recepción lo pasa a finalizado', async () => {
    api.confirmarRecepcion.mockReturnValue(of(pedido('FINALIZADO', ['FINALIZADO'])));
    api.consultarEstadoValoracion.mockReturnValue(of({ valorada: false }));
    const { pagina, alertas } = crear(pedido('TRAMITADO_ENVIADO', ['TRAMITADO_ENVIADO']));
    await pagina.confirmarRecepcionPedido();
    alertas.pulsar('Sí, lo he recibido');
    expect(api.confirmarRecepcion).toHaveBeenCalledWith('abcdef123456');
    expect(pagina.pedido()?.estado).toBe('FINALIZADO');
  });
});
