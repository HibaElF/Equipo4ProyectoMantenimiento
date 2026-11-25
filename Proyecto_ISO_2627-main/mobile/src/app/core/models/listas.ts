import { ProductoFavorito } from './favoritos';

export interface ResumenLista {
  id: string;
  nombre: string;
  /** La lista predeterminada es «Favoritos»; las demás las crea el cliente. */
  predeterminada: boolean;
  productoIds: string[];
}

export interface ListaProductos {
  id: string;
  nombre: string;
  predeterminada: boolean;
  productos: ProductoFavorito[];
}
