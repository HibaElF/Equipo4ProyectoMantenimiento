import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { MetodoPago, MetodoPagoRequest, TipoPago } from '../models/metodo-pago';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly ruta = '/cliente/metodos-pago';

  consultarTipos(): Observable<TipoPago[]> {
    return this.http.get<TipoPago[]>(`${environment.apiUrl}${this.ruta}/tipos`, { withCredentials: true });
  }

  consultarMetodos(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${environment.apiUrl}${this.ruta}`, { withCredentials: true });
  }

  registrar(request: MetodoPagoRequest): Observable<MetodoPago> {
    return this.auth.peticionConCsrf<MetodoPago>('POST', this.ruta, request);
  }

  eliminar(id: string): Observable<void> {
    return this.auth.peticionConCsrf<void>('DELETE', `${this.ruta}/${encodeURIComponent(id)}`);
  }
}
