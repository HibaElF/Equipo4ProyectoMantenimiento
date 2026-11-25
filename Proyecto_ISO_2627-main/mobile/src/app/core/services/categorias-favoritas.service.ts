import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { CategoriaFavorita } from '../models/categoria-favorita';

/** Categorías favoritas del cliente: mismos endpoints que la web. */
@Injectable({ providedIn: 'root' })
export class CategoriasFavoritasService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/cliente/categorias-favoritas`;

  consultar(): Observable<CategoriaFavorita[]> {
    return this.http.get<CategoriaFavorita[]>(this.url, { withCredentials: true });
  }

  /** Catálogo completo de categorías (id y nombre) para traducir el nombre del filtro a su id. */
  consultarCategorias(): Observable<CategoriaFavorita[]> {
    return this.http.get<CategoriaFavorita[]>(`${environment.apiUrl}/categorias/registro`);
  }

  anadir(categoriaId: string): Observable<CategoriaFavorita[]> {
    return this.auth.peticionConCsrf<CategoriaFavorita[]>(
      'PUT',
      `/cliente/categorias-favoritas/${encodeURIComponent(categoriaId)}`
    );
  }

  quitar(categoriaId: string): Observable<CategoriaFavorita[]> {
    return this.auth.peticionConCsrf<CategoriaFavorita[]>(
      'DELETE',
      `/cliente/categorias-favoritas/${encodeURIComponent(categoriaId)}`
    );
  }
}

/** Mismos mensajes que la web. */
export function mensajeErrorCategoriaFavorita(e: HttpErrorResponse): string {
  if (e.status === 0) return 'No se pudo conectar con el servidor.';
  if (e.status === 404) return 'La categoría ya no existe.';
  return 'No se pudo actualizar la categoría favorita.';
}
