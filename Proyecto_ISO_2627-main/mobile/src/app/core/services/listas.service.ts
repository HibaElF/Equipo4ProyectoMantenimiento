import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ListaProductos, ResumenLista } from '../models/listas';

/** Mismas operaciones que la web (HU-39). El propietario lo decide el backend por la sesión. */
@Injectable({ providedIn: 'root' })
export class ListasService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ruta = '/usuarios/listas';

  consultarListas(): Observable<ResumenLista[]> {
    return this.http.get<ResumenLista[]>(`${environment.apiUrl}${this.ruta}`, { withCredentials: true });
  }

  consultarLista(listaId: string): Observable<ListaProductos> {
    return this.http.get<ListaProductos>(`${environment.apiUrl}${this.rutaLista(listaId)}`, { withCredentials: true });
  }

  crearLista(nombre: string): Observable<ListaProductos> {
    return this.auth.peticionConCsrf<ListaProductos>('POST', this.ruta, { nombre });
  }

  renombrarLista(listaId: string, nombre: string): Observable<ListaProductos> {
    return this.auth.peticionConCsrf<ListaProductos>('PUT', this.rutaLista(listaId), { nombre });
  }

  eliminarLista(listaId: string): Observable<void> {
    return this.auth.peticionConCsrf<void>('DELETE', this.rutaLista(listaId));
  }

  anadirProducto(listaId: string, productoId: string): Observable<ListaProductos> {
    return this.auth.peticionConCsrf<ListaProductos>('PUT', this.rutaProducto(listaId, productoId));
  }

  quitarProducto(listaId: string, productoId: string): Observable<ListaProductos> {
    return this.auth.peticionConCsrf<ListaProductos>('DELETE', this.rutaProducto(listaId, productoId));
  }

  private rutaLista(listaId: string): string {
    return `${this.ruta}/${encodeURIComponent(listaId)}`;
  }

  private rutaProducto(listaId: string, productoId: string): string {
    return `${this.rutaLista(listaId)}/productos/${encodeURIComponent(productoId)}`;
  }
}
