import { ProductoCatalogo, porcentajeRebaja, puedeConsultarDetalle } from './producto';

const base: ProductoCatalogo = {
  id: 'p1',
  nombre: 'Producto',
  categoria: 'Hogar',
  stock: 3,
  precio: 80,
  precioOriginal: 100,
  descuento: 20,
  descuentoPremium: 0,
  descuentoAplicado: 20,
  descripcion: null,
  imagen: null,
  vendedor: 'Tienda',
  esVisible: true,
  soloPremium: false
};

describe('producto', () => {
  it('calcula el porcentaje rebajado', () => {
    expect(porcentajeRebaja(base)).toBe(20);
    expect(porcentajeRebaja({ ...base, precio: 100 })).toBe(0);
    expect(porcentajeRebaja({ ...base, precio: null })).toBe(0);
  });

  it('bloquea el detalle de los productos solo Premium si el backend no lo permite', () => {
    expect(puedeConsultarDetalle(base)).toBe(true);
    expect(puedeConsultarDetalle({ ...base, soloPremium: true })).toBe(false);
    expect(puedeConsultarDetalle({ ...base, soloPremium: true, puedeConsultarDetalle: true })).toBe(true);
  });
});
