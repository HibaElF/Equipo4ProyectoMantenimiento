import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Direccion, DireccionRequest } from '../models/direccion';

@Injectable({ providedIn: 'root' })
export class DireccionesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ruta = '/cliente/direcciones';

  consultar(): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(`${environment.apiUrl}${this.ruta}`, { withCredentials: true });
  }

  agregar(request: DireccionRequest): Observable<Direccion> {
    return this.auth.peticionConCsrf<Direccion>('POST', this.ruta, request);
  }

  modificar(id: string, request: DireccionRequest): Observable<Direccion> {
    return this.auth.peticionConCsrf<Direccion>('PUT', `${this.ruta}/${encodeURIComponent(id)}`, request);
  }

  eliminar(id: string): Observable<void> {
    return this.auth.peticionConCsrf<void>('DELETE', `${this.ruta}/${encodeURIComponent(id)}`);
  }
}
