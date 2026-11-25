import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { EstadisticasValoraciones, EstadisticasVentas } from './estadisticas-vendedor.service';

// Valoración de un vendedor: media de todas las valoraciones de sus productos (dos decimales),
// número de valoraciones y cuántos de sus productos tienen alguna.
export interface VendedorValoracion {
  vendedor: string;
  valoracionMedia: number;
  numeroValoraciones: number;
  productosValorados: number;
}

// PBI 281: Top 10 de vendedores. Los vendedores activos sin valoraciones no entran y se indican aparte.
export interface EstadisticasVendedores {
  ranking: VendedorValoracion[];
  vendedoresSinValoraciones: string[];
  aviso: string | null;
}

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

  // PBI 281
  consultarVendedores(): Observable<EstadisticasVendedores> {
    return this.http.get<EstadisticasVendedores>(`${this.baseUrl}/vendedores`, {
      withCredentials: true
    });
  }
}
