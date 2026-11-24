import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

import {
  Alerta,
  AlertasResponse,
  AlertasService,
  TipoAlerta
} from './alertas.service';

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  BAJADA_PRECIO: 'Bajada de precio',
  DISPONIBILIDAD: 'Disponible de nuevo',
  RECOMENDACION: 'Recomendación'
};

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './alertas.html',
  styleUrls: ['../tienda/tienda.css', './alertas.css']
})
export class Alertas implements OnInit {

  private readonly servicioAlertas = inject(AlertasService);
  private readonly enrutador = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);

  readonly alertas = signal<Alerta[]>([]);
  readonly noLeidas = signal(0);

  readonly cargando = signal(true);
  readonly operacion = signal<string | null>(null);

  readonly error = signal('');
  readonly exito = signal('');

  ngOnInit(): void {
    this.cargarAlertas();
  }

  cargarAlertas(): void {
    this.cargando.set(true);
    this.error.set('');
    this.exito.set('');

    this.servicioAlertas.consultar().subscribe({
      next: (respuesta) => {
        this.actualizarAlertas(respuesta);
        this.cargando.set(false);
      },

      error: (fallo: HttpErrorResponse) => {
        this.cargando.set(false);
        this.gestionarError(fallo, 'No se pudieron cargar tus alertas.');
      }
    });
  }

  marcarLeida(alerta: Alerta): void {
    if (this.operacion() !== null) {
      return;
    }

    this.operacion.set(alerta.id);
    this.error.set('');
    this.exito.set('');

    this.servicioAlertas.marcarLeida(alerta.id).subscribe({
      next: (respuesta) => {
        this.actualizarAlertas(respuesta);
        this.operacion.set(null);
      },

      error: (fallo: HttpErrorResponse) => {
        this.operacion.set(null);
        this.gestionarError(fallo, 'No se pudo marcar la alerta como leída.');
      }
    });
  }

  marcarTodasLeidas(): void {
    if (this.operacion() !== null) {
      return;
    }

    this.operacion.set('todas');
    this.error.set('');
    this.exito.set('');

    this.servicioAlertas.marcarTodasLeidas().subscribe({
      next: (respuesta) => {
        this.actualizarAlertas(respuesta);
        this.operacion.set(null);
        this.exito.set('Todas las alertas están marcadas como leídas.');
      },

      error: (fallo: HttpErrorResponse) => {
        this.operacion.set(null);
        this.gestionarError(fallo, 'No se pudieron marcar las alertas como leídas.');
      }
    });
  }

  borrar(alerta: Alerta): void {
    if (this.operacion() !== null) {
      return;
    }

    this.operacion.set(alerta.id);
    this.error.set('');
    this.exito.set('');

    this.servicioAlertas.borrar(alerta.id).subscribe({
      next: (respuesta) => {
        this.actualizarAlertas(respuesta);
        this.operacion.set(null);
        this.exito.set('Alerta borrada.');
      },

      error: (fallo: HttpErrorResponse) => {
        this.operacion.set(null);
        this.gestionarError(fallo, 'No se pudo borrar la alerta.');
      }
    });
  }

  async borrarTodas(): Promise<void> {
    if (this.operacion() !== null) {
      return;
    }

    const confirmado = await this.confirmacion.confirmar({
      titulo: 'Borrar alertas',
      mensaje: '¿Borrar todas tus alertas? No se podrán recuperar.',
      aceptar: 'Borrar todas',
      peligro: true
    });
    if (!confirmado) {
      return;
    }

    this.operacion.set('todas');
    this.error.set('');
    this.exito.set('');

    this.servicioAlertas.borrarTodas().subscribe({
      next: (respuesta) => {
        this.actualizarAlertas(respuesta);
        this.operacion.set(null);
        this.exito.set('Se han borrado todas tus alertas.');
      },

      error: (fallo: HttpErrorResponse) => {
        this.operacion.set(null);
        this.gestionarError(fallo, 'No se pudieron borrar las alertas.');
      }
    });
  }

  etiquetaTipo(tipo: TipoAlerta): string {
    return ETIQUETAS_TIPO[tipo];
  }

  private actualizarAlertas(respuesta: AlertasResponse): void {
    this.alertas.set(respuesta.alertas);
    this.noLeidas.set(respuesta.noLeidas);
  }

  private gestionarError(
    fallo: HttpErrorResponse,
    mensajePredeterminado: string
  ): void {
    if (fallo.status === 401) {
      this.error.set('Tu sesión ha caducado.');
      this.enrutador.navigate(
        ['/login'],
        { queryParams: { motivo: 'sesion-expirada' } }
      );
      return;
    }

    if (fallo.status === 0) {
      this.error.set('No se pudo conectar con el servidor.');
      return;
    }

    if (fallo.status === 404) {
      this.error.set('La alerta ya no existe. Recarga la lista.');
      return;
    }

    this.error.set(mensajePredeterminado);
  }
}
