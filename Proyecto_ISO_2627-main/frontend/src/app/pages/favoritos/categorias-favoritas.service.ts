import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { RespuestaTokenCsrf } from '../../shared/models/respuesta-token-csrf';

export interface CategoriaFavorita {
  id: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriasFavoritasService {

  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/cliente/categorias-favoritas`;

  consultar(): Observable<CategoriaFavorita[]> {
    return this.http.get<CategoriaFavorita[]>(
      this.url,
      { withCredentials: true }
    );
  }

  // Catálogo completo de categorías (id y nombre) para traducir el nombre del filtro a su id.
  consultarCategorias(): Observable<CategoriaFavorita[]> {
    return this.http.get<CategoriaFavorita[]>(
      `${environment.apiUrl}/categorias/registro`
    );
  }

  anadir(categoriaId: string): Observable<CategoriaFavorita[]> {
    return this.modificar('PUT', categoriaId);
  }

  quitar(categoriaId: string): Observable<CategoriaFavorita[]> {
    return this.modificar('DELETE', categoriaId);
  }

  private modificar(
    metodo: 'PUT' | 'DELETE',
    categoriaId: string
  ): Observable<CategoriaFavorita[]> {

    return this.http.get<RespuestaTokenCsrf>(
      `${environment.apiUrl}/usuarios/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(({ token }) =>
        this.http.request<CategoriaFavorita[]>(
          metodo,
          `${this.url}/${encodeURIComponent(categoriaId)}`,
          {
            withCredentials: true,
            headers: new HttpHeaders()
              .set('X-XSRF-TOKEN', token)
          }
        )
      )
    );
  }
}
