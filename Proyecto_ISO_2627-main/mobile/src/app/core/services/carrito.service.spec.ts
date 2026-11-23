import { HttpErrorResponse } from '@angular/common/http';
import { mensajeErrorCarrito, mensajeErrorOperacionCarrito } from './carrito.service';

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

describe('mensajeErrorCarrito: resto de casos', () => {
  it('cada estado con su mensaje', () => {
    expect(mensajeErrorCarrito(error(401))).toBe('Tu sesión ha caducado. Inicia sesión de nuevo.');
    expect(mensajeErrorCarrito(error(404))).toBe('El producto ya no está disponible o ha sido eliminado.');
    expect(mensajeErrorCarrito(error(403))).toContain('No tienes permiso');
    expect(mensajeErrorCarrito(error(409))).toBe('El carrito se ha modificado. Inténtalo de nuevo.');
    expect(mensajeErrorCarrito(error(500))).toBe('No se pudo añadir el producto al carrito. Inténtalo de nuevo.');
  });
});

describe('mensajeErrorOperacionCarrito', () => {
  it('mensajes funcionales conocidos y genéricos', () => {
    expect(mensajeErrorOperacionCarrito(error(400, { error: 'El producto está agotado.' }), 'x')).toBe('El producto está agotado.');
    expect(mensajeErrorOperacionCarrito(error(400, { error: 'Interno' }), 'Por defecto')).toBe('Por defecto');
    expect(mensajeErrorOperacionCarrito(error(0), 'x')).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    expect(mensajeErrorOperacionCarrito(error(401), 'x')).toBe('Tu sesión ha caducado. Inicia sesión de nuevo.');
    expect(mensajeErrorOperacionCarrito(error(404), 'x', true)).toBe('El producto ya no está en el carrito o ha sido eliminado.');
    expect(mensajeErrorOperacionCarrito(error(404), 'Por defecto')).toBe('Por defecto');
    expect(mensajeErrorOperacionCarrito(error(409), 'x')).toBe('El carrito se ha modificado. Vuelve a intentarlo.');
  });
});
