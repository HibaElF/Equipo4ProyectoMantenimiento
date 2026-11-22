import { Direccion } from './direccion';

export type EstadoPedido = 'EN_PROCESO' | 'PAGADO_COMPLETADO' | 'TRAMITADO_ENVIADO' | 'FINALIZADO' | 'CANCELADO';

export interface LineaPedido {
  productoId: string;
  nombreProducto: string;
  precioCompra: number;
  cantidad: number;
  vendedorId: string;
  nombreVendedor: string;
}

export interface Pedido {
  id: string;
  lineas: LineaPedido[];
  estado: EstadoPedido;
  importe: number;
  fechaCreacion: string;
  fechaPago: string | null;
  direccionEnvio: Direccion;
  metodoPagoId: string;
}

export interface CrearPedidoRequest {
  direccionId: string;
  metodoPagoId: string;
  /** Identificador de la operación: evita cobrar dos veces si se repite la petición. */
  operacionId: string;
}

export interface Compra {
  pedidos: Pedido[];
  importeTotal: number;
}

/** Mismos textos que la web. */
export function textoEstadoPedido(estado: EstadoPedido): string {
  switch (estado) {
    case 'EN_PROCESO':
      return 'En proceso';
    case 'PAGADO_COMPLETADO':
      return 'Pagado / Completado';
    case 'TRAMITADO_ENVIADO':
      return 'Tramitado / Enviado';
    case 'FINALIZADO':
      return 'Finalizado';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

/** Vendedores de un pedido (normalmente uno; los pedidos antiguos pueden tener varios). */
export function vendedoresPedido(pedido: Pedido): string {
  return [...new Set(pedido.lineas.map((l) => l.nombreVendedor).filter(Boolean))].join(', ');
}
