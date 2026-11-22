import { HttpErrorResponse } from '@angular/common/http';
import { mensajeErrorCarrito } from './carrito.service';

const error = (status: number, cuerpo: unknown = null) => new HttpErrorResponse({ status, error: cuerpo });

describe('mensajeErrorCarrito', () => {
  it('muestra los mensajes funcionales conocidos del backend', () => {
    expect(mensajeErrorCarrito(error(400, { error: 'No hay stock suficiente para la cantidad total solicitada.' }))).toBe(
      'No hay stock suficiente para la cantidad total solicitada.'
    );
  });

  it('no muestra mensajes internos desconocidos', () => {
    expect(mensajeErrorCarrito(error(400, { error: 'NullPointerException en línea 42' }))).toBe(
      'No se pudo añadir el producto. Revisa la cantidad y la disponibilidad.'
    );
  });

  it('avisa si no hay conexión', () => {
    expect(mensajeErrorCarrito(error(0))).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
  });
});
