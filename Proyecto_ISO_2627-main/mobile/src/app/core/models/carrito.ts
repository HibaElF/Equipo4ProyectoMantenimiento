export interface LineaCarrito {
  productoId: string;
  cantidad: number;
  precioUnitario: number | null;
  subtotal: number | null;
  nombre: string | null;
  imagen: string | null;
  stock: number | null;
  disponible: boolean;
  aviso: string | null;
  vendedor?: string | null;
}

export interface Carrito {
  productos: LineaCarrito[];
  importe: number;
}
