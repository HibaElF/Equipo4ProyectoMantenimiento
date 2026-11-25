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

export interface CambioEstadoPedido {
  estado: EstadoPedido;
  fecha: string;
}

/** Pedido tal como lo ve el cliente en «Mis pedidos» (con su historial de estados). */
export interface PedidoCliente {
  id: string;
  lineas: LineaPedido[];
  estado: EstadoPedido;
  importe: number;
  fechaCreacion: string;
  fechaPago: string | null;
  direccionEnvio: Omit<Direccion, 'id'> | null;
  historialEstados: CambioEstadoPedido[];
}

export interface CrearValoracion {
  puntuacion: number;
  comentario: string;
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

/** Referencia corta que ve el cliente, igual que en la web: los 6 últimos caracteres. */
export function referenciaPedido(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Igual que la web: se puede cancelar mientras no se haya enviado. */
export function puedeCancelar(estado: EstadoPedido): boolean {
  return estado === 'EN_PROCESO' || estado === 'PAGADO_COMPLETADO';
}

/** Igual que la web: la recepción se confirma cuando el pedido está enviado. */
export function puedeConfirmarRecepcion(estado: EstadoPedido): boolean {
  return estado === 'TRAMITADO_ENVIADO';
}

/** Vendedores de un pedido (normalmente uno; los pedidos antiguos pueden tener varios). */
export function vendedoresPedido(pedido: Pick<Pedido, 'lineas'>): string {
  return [...new Set(pedido.lineas.map((l) => l.nombreVendedor).filter(Boolean))].join(', ');
}
