import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ApartadoEstadisticas } from './apartado-estadisticas';
import { EstadisticasAdminService, EstadisticasVendedores } from './estadisticas-admin.service';
import type { EstadisticasValoraciones, EstadisticasVentas, ProductoVentas } from './estadisticas-vendedor.service';

// Las valoraciones van de 1 a 5: la barra de una media se dibuja sobre 5
export const PUNTUACION_MAXIMA = 5;

// Ancho de una barra del gráfico, en porcentaje del valor máximo (0 si no hay máximo)
export function porcentajeBarra(valor: number, maximo: number): number {
  if (maximo <= 0 || valor <= 0) {
    return 0;
  }
  return Math.min(100, (valor / maximo) * 100);
}

// Estadísticas globales de la plataforma para cualquier administrador: cada ranking se ve como una tabla
// con un gráfico de barras en la columna del valor (vista mixta).
@Component({
  selector: 'app-estadisticas-admin',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet],
  templateUrl: './estadisticas-admin.html',
  styleUrls: ['../tienda/tienda.css', './estadisticas.css']
})
export class EstadisticasAdmin implements OnInit {
  private readonly servicio = inject(EstadisticasAdminService);
  private readonly router = inject(Router);

  readonly porcentajeBarra = porcentajeBarra;
  readonly puntuacionMaxima = PUNTUACION_MAXIMA;

  // PBI 279
  readonly ventas = new ApartadoEstadisticas<EstadisticasVentas>((fallo) => this.mensajeError(fallo));
  // PBI 280
  readonly valoraciones = new ApartadoEstadisticas<EstadisticasValoraciones>((fallo) => this.mensajeError(fallo));
  // PBI 281
  readonly vendedores = new ApartadoEstadisticas<EstadisticasVendedores>((fallo) => this.mensajeError(fallo));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.ventas.cargar(this.servicio.consultarVentas());
    this.valoraciones.cargar(this.servicio.consultarValoraciones());
    this.vendedores.cargar(this.servicio.consultarVendedores());
  }

  cargando(): boolean {
    return this.ventas.cargando() || this.valoraciones.cargando() || this.vendedores.cargando();
  }

  // Las barras de las dos listas de ventas usan la misma escala: el producto más vendido
  maximoUnidades(datos: EstadisticasVentas): number {
    return Math.max(0, ...[...datos.masVendidos, ...datos.menosVendidos].map((p: ProductoVentas) => p.unidadesVendidas));
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 401) {
      this.router.navigateByUrl('/login');
      return 'Tu sesión ha caducado. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'Solo los administradores pueden consultar las estadísticas de la plataforma.';
    }

    if (error.status === 0) {
      return 'No se puede conectar con el servidor.';
    }

    return 'No se han podido cargar las estadísticas. Inténtalo de nuevo.';
  }
}
