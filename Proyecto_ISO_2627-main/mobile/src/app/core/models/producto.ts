/** Mismos datos que devuelve el backend a la web (GET /cliente/productos). */
export interface ProductoCatalogo {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  precio: number | null;
  precioOriginal: number | null;
  descuento: number;
  descuentoPremium: number;
  descuentoAplicado: number;
  descripcion: string | null;
  imagen: string | null;
  vendedor: string | null;
  esVisible: boolean;
  soloPremium: boolean;
  puedeConsultarDetalle?: boolean;
}

export interface FiltrosCatalogo {
  nombre?: string;
  categoria?: string;
  precioMinimo?: number;
  precioMaximo?: number;
  disponible?: boolean;
}

export interface ValoracionPublica {
  puntuacion: number;
  comentario: string | null;
}

export interface ValoracionesProducto {
  media: number;
  total: number;
  valoraciones: ValoracionPublica[];
}

/** Igual que la web: un producto solo Premium no se puede consultar si el backend no lo permite. */
export function puedeConsultarDetalle(producto: ProductoCatalogo): boolean {
  return producto.puedeConsultarDetalle ?? !producto.soloPremium;
}

/** Porcentaje total rebajado respecto al precio original (0 si no hay oferta). */
export function porcentajeRebaja(producto: ProductoCatalogo): number {
  const { precio, precioOriginal } = producto;
  if (precio === null || precioOriginal === null || precioOriginal <= 0 || precioOriginal <= precio) {
    return 0;
  }
  return Math.round((1 - precio / precioOriginal) * 100);
}
