/** Categoría (id y nombre), tal como la devuelve el backend. */
export interface CategoriaFavorita {
  id: string;
  nombre: string;
}

/** Los productos guardan el nombre de la categoría sin distinguir mayúsculas (igual que la web). */
export function claveCategoria(nombre: string): string {
  return nombre.trim().toLowerCase();
}
