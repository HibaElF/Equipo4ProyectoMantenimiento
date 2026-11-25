import { Direccion, textoDireccion } from './direccion';
import {
  EstadoPedido,
  puedeCancelar,
  puedeConfirmarRecepcion,
  referenciaPedido,
  textoEstadoPedido,
  vendedoresPedido
} from './pedido';

describe('modelos', () => {
  it('textos de estado iguales que la web', () => {
    const textos = (['EN_PROCESO', 'PAGADO_COMPLETADO', 'TRAMITADO_ENVIADO', 'FINALIZADO', 'CANCELADO'] as EstadoPedido[]).map(
      textoEstadoPedido
    );
    expect(textos).toEqual(['En proceso', 'Pagado / Completado', 'Tramitado / Enviado', 'Finalizado', 'Cancelado']);
  });

  it('referencia: los 6 últimos caracteres en mayúsculas', () => {
    expect(referenciaPedido('665f1a2b3c4d5e6f7a8b9c01')).toBe('8B9C01');
  });

  it('qué acciones permite cada estado', () => {
    expect(puedeCancelar('EN_PROCESO')).toBe(true);
    expect(puedeCancelar('PAGADO_COMPLETADO')).toBe(true);
    expect(puedeCancelar('TRAMITADO_ENVIADO')).toBe(false);
    expect(puedeConfirmarRecepcion('TRAMITADO_ENVIADO')).toBe(true);
    expect(puedeConfirmarRecepcion('FINALIZADO')).toBe(false);
  });

  it('vendedores sin repetir ni vacíos', () => {
    const linea = (nombreVendedor: string) =>
      ({ productoId: 'p', nombreProducto: 'x', precioCompra: 1, cantidad: 1, vendedorId: 'v', nombreVendedor });
    expect(vendedoresPedido({ lineas: [linea('Ana'), linea(''), linea('Ana'), linea('Luis')] })).toBe('Ana, Luis');
  });

  it('dirección en una línea, con portal y piso solo si los hay', () => {
    const base: Direccion = {
      id: '1', nombre: 'Casa', calle: 'Calle Mayor', numero: '3', codigoPostal: '13001', ciudad: 'Ciudad Real', provincia: 'CR'
    };
    expect(textoDireccion(base)).toBe('Calle Mayor, 3 · Ciudad Real (13001)');
    expect(textoDireccion({ ...base, portal: 'B', piso: '2º B' })).toBe('Calle Mayor, 3, portal B, 2º B · Ciudad Real (13001)');
  });
});
