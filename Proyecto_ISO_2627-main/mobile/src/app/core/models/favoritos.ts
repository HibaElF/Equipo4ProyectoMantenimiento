export interface ProductoFavorito {
  id: string;
  nombre: string;
  imagen: string | null;
  precio: number | null;
  stock: number | null;
  disponible: boolean;
  aviso: string | null;
}

export interface Favoritos {
  ids: string[];
  productos: ProductoFavorito[];
}
