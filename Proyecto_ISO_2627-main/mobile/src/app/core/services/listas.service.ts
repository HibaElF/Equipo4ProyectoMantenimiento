import { AbstractControl, FormControl, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ListaProductos, ResumenLista } from '../models/listas';

export const MAX_NOMBRE_LISTA = 50;

/** Igual que la web y el backend: el nombre se recorta antes de validarlo. */
function nombreNoVacio(control: AbstractControl<string>): ValidationErrors | null {
  return (control.value ?? '').trim() === '' ? { required: true } : null;
}

export function crearControlNombreLista(valor = ''): FormControl<string> {
  return new FormControl(valor, { nonNullable: true, validators: [nombreNoVacio, Validators.maxLength(MAX_NOMBRE_LISTA)] });
}

/** Mismos mensajes que la web: solo se muestran los mensajes funcionales del backend de listas. */
export function mensajeErrorListas(error: HttpErrorResponse, porDefecto: string): string {
  if (error.status === 401) return 'Tu sesión ha caducado.';
  if (error.status === 0) return 'No se pudo conectar con el servidor.';
  const mensaje = error.error?.error;
  if ([400, 404, 409].includes(error.status) && typeof mensaje === 'string' && mensaje) return mensaje;
  return porDefecto;
}

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
