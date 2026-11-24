import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Unidades vendidas de un producto en pedidos finalizados.
export interface ProductoVentas {
  productoId: string;
  nombre: string;
  vendedor: string | null;
  unidadesVendidas: number;
}

// PBI 276: Top 10 de productos más y menos vendidos. El aviso explica cuándo no hay datos suficientes.
export interface EstadisticasVentas {
  masVendidos: ProductoVentas[];
  menosVendidos: ProductoVentas[];
  aviso: string | null;
}

// Valoración media (dos decimales) y número de valoraciones de un producto; media null si no tiene ninguna.
export interface ProductoValoracion {
  productoId: string;
  nombre: string;
  vendedor: string | null;
  valoracionMedia: number | null;
  numeroValoraciones: number;
}

// PBI 277: Top 10 de productos mejor y peor valorados (solo los que tienen alguna valoración).
export interface EstadisticasValoraciones {
  mejorValorados: ProductoValoracion[];
  peorValorados: ProductoValoracion[];
  aviso: string | null;
}

// PBI 278: valoración media de cada producto del catálogo (también de los que no tienen valoraciones)
// y de la tienda, calculada con todas sus valoraciones. La media de la tienda es null si no hay ninguna.
export interface ValoracionesCatalogo {
  valoracionMediaGlobal: number | null;
  numeroValoraciones: number;
  productos: ProductoValoracion[];
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasVendedorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vendedor/estadisticas`;

  consultarVentas(): Observable<EstadisticasVentas> {
    return this.http.get<EstadisticasVentas>(`${this.baseUrl}/ventas`, {
      withCredentials: true
    });
  }

  consultarValoraciones(): Observable<EstadisticasValoraciones> {
    return this.http.get<EstadisticasValoraciones>(`${this.baseUrl}/valoraciones`, {
      withCredentials: true
    });
  }

  consultarValoracionesCatalogo(): Observable<ValoracionesCatalogo> {
    return this.http.get<ValoracionesCatalogo>(`${this.baseUrl}/productos`, {
      withCredentials: true
    });
  }
}
