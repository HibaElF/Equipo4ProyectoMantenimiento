import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { EstadisticasValoraciones, EstadisticasVentas } from './estadisticas-vendedor.service';

// Estadísticas globales de la plataforma: productos de todas las tiendas, con su vendedor.
@Injectable({
  providedIn: 'root'
})
export class EstadisticasAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/administrador/estadisticas`;

  // PBI 279
  consultarVentas(): Observable<EstadisticasVentas> {
    return this.http.get<EstadisticasVentas>(`${this.baseUrl}/ventas`, {
      withCredentials: true
    });
  }

  // PBI 280
  consultarValoraciones(): Observable<EstadisticasValoraciones> {
    return this.http.get<EstadisticasValoraciones>(`${this.baseUrl}/valoraciones`, {
      withCredentials: true
    });
  }
}
