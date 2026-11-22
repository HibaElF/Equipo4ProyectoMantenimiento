import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CarritoEstadoService } from './carrito-estado.service';
import { LineaCarrito } from '../models/carrito';

const linea = (productoId: string, cantidad: number): LineaCarrito => ({
  productoId,
  cantidad,
  precioUnitario: 1,
  subtotal: cantidad,
  nombre: productoId,
  imagen: null,
  stock: 10,
  disponible: true,
  aviso: null
});

describe('CarritoEstadoService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient()] }));

  it('cuenta las unidades del carrito para el numerito de la pestaña', () => {
    const estado = TestBed.inject(CarritoEstadoService);
    expect(estado.unidades()).toBe(0);
    estado.actualizar({ productos: [linea('a', 2), linea('b', 3)], importe: 5 });
    expect(estado.unidades()).toBe(5);
    estado.reiniciar();
    expect(estado.unidades()).toBe(0);
  });
});
