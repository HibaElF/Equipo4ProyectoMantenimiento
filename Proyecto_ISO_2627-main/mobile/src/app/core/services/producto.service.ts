import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltrosCatalogo, ProductoCatalogo, ValoracionesProducto } from '../models/producto';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  consultarCatalogo(filtros: FiltrosCatalogo = {}): Observable<ProductoCatalogo[]> {
    let params = new HttpParams();
    if (filtros.nombre) params = params.set('nombre', filtros.nombre);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.precioMinimo !== undefined) params = params.set('precioMinimo', filtros.precioMinimo);
    if (filtros.precioMaximo !== undefined) params = params.set('precioMaximo', filtros.precioMaximo);
    if (filtros.disponible !== undefined) params = params.set('disponible', filtros.disponible);
    return this.http.get<ProductoCatalogo[]>(`${this.api}/cliente/productos`, { params, withCredentials: true });
  }

  consultarDetalle(id: string): Observable<ProductoCatalogo> {
    return this.http.get<ProductoCatalogo>(`${this.api}/cliente/productos/${encodeURIComponent(id)}`, {
      withCredentials: true
    });
  }

  consultarValoraciones(id: string): Observable<ValoracionesProducto> {
    return this.http.get<ValoracionesProducto>(
      `${this.api}/cliente/productos/${encodeURIComponent(id)}/valoraciones`,
      { withCredentials: true }
    );
  }

  /** Misma regla que la web: las imágenes locales se sirven desde el backend. */
  urlImagen(imagen: string): string {
    const ruta = imagen.trim();
    if (/^https?:\/\//i.test(ruta)) return ruta;
    const destino = ruta.startsWith('/') ? ruta : `/product-images/${ruta}`;
    return `${this.api}${destino}`;
  }
}
