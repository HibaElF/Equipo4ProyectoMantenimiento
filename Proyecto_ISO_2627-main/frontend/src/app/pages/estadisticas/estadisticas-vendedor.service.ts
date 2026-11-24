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
}
