import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { VerificarCorreoService } from './verificar-correo.service';

type Estado = 'verificando' | 'verificado' | 'error';

const MENSAJE_ENLACE_INVALIDO = 'El enlace de verificación no es válido o ha caducado.';

// Destino del enlace del correo de alta: confirma que la persona controla la dirección indicada.
@Component({
  imports: [RouterLink],
  selector: 'app-verificar-correo',
  styleUrls: ['../acceso/acceso.css'],
  templateUrl: './verificar-correo.html'
})
export class VerificarCorreo {
  private readonly servicio = inject(VerificarCorreoService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly estado = signal<Estado>('verificando');
  readonly mensajeError = signal('');

  constructor() {
    if (this.token.length === 0) {
      this.fallar(MENSAJE_ENLACE_INVALIDO);
      return;
    }

    this.servicio.verificar(this.token).subscribe({
      next: () => this.estado.set('verificado'),
      error: (error: HttpErrorResponse) => this.fallar(this.mensajeDe(error))
    });
  }

  private fallar(mensaje: string): void {
    this.mensajeError.set(mensaje);
    this.estado.set('error');
  }

  private mensajeDe(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servicio. Inténtalo de nuevo más tarde.';
    }
    if (error.status === 429) {
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    }
    const mensaje = error.error?.error;
    return error.status === 400 && typeof mensaje === 'string' ? mensaje : MENSAJE_ENLACE_INVALIDO;
  }
}
