import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ApartadoEstadisticas } from './apartado-estadisticas';
import {
  EstadisticasValoraciones,
  EstadisticasVendedorService,
  EstadisticasVentas
} from './estadisticas-vendedor.service';

// Estadísticas de la tienda del vendedor de la sesión: el backend solo devuelve sus productos.
@Component({
  selector: 'app-estadisticas-vendedor',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet],
  templateUrl: './estadisticas-vendedor.html',
  styleUrls: ['../tienda/tienda.css', './estadisticas.css']
})
export class EstadisticasVendedor implements OnInit {
  private readonly servicio = inject(EstadisticasVendedorService);
  private readonly router = inject(Router);

  // PBI 276
  readonly ventas = new ApartadoEstadisticas<EstadisticasVentas>((fallo) => this.mensajeError(fallo));
  // PBI 277
  readonly valoraciones = new ApartadoEstadisticas<EstadisticasValoraciones>((fallo) => this.mensajeError(fallo));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.ventas.cargar(this.servicio.consultarVentas());
    this.valoraciones.cargar(this.servicio.consultarValoraciones());
  }

  cargando(): boolean {
    return this.ventas.cargando() || this.valoraciones.cargando();
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 401) {
      this.router.navigateByUrl('/login');
      return 'Tu sesión ha caducado. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'Solo los vendedores pueden consultar las estadísticas de su tienda.';
    }

    if (error.status === 0) {
      return 'No se puede conectar con el servidor.';
    }

    return 'No se han podido cargar las estadísticas. Inténtalo de nuevo.';
  }
}
