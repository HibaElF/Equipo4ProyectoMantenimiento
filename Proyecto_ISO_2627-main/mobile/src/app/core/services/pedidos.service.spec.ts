import { HttpErrorResponse } from '@angular/common/http';
import { mensajeErrorPedido } from './pedidos.service';

const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('mensajeErrorPedido', () => {
  it('sesión caducada y sin conexión', () => {
    expect(mensajeErrorPedido(err(401), 'cancelar')).toBe('Tu sesión ha caducado. Inicia sesión nuevamente.');
    expect(mensajeErrorPedido(err(0), 'consulta')).toBe('No se puede conectar con el servidor.');
    expect(mensajeErrorPedido(err(0), 'valoracion')).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
  });

  it('usa el mensaje del servidor en las acciones', () => {
    expect(mensajeErrorPedido(err(400, { error: 'No se puede cancelar.' }), 'cancelar')).toBe('No se puede cancelar.');
  });

  it('mensajes propios de cada operación', () => {
    expect(mensajeErrorPedido(err(404), 'consulta')).toBe('El pedido no existe o no está disponible.');
    expect(mensajeErrorPedido(err(409), 'recepcion')).toBe('El pedido ya no está en estado enviado.');
    expect(mensajeErrorPedido(err(409), 'valoracion')).toBe('Este producto ya está valorado.');
    expect(mensajeErrorPedido(err(500), 'cancelar')).toBe('No se pudo cancelar el pedido. Inténtalo de nuevo.');
  });
});
